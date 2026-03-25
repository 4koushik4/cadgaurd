import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface MaterialProperties {
  name: string;
  youngs_modulus: number;
  poissons_ratio: number;
  yield_strength: number;
  density: number;
}

interface LoadCondition {
  force: number;
  direction: string;
  location: string;
}

const materials: Record<string, MaterialProperties> = {
  aluminum_6061: {
    name: "Aluminum 6061-T6",
    youngs_modulus: 68.9,
    poissons_ratio: 0.33,
    yield_strength: 276,
    density: 2700
  },
  steel_1045: {
    name: "Carbon Steel 1045",
    youngs_modulus: 200,
    poissons_ratio: 0.29,
    yield_strength: 530,
    density: 7850
  },
  titanium_ti6al4v: {
    name: "Titanium Ti-6Al-4V",
    youngs_modulus: 113.8,
    poissons_ratio: 0.342,
    yield_strength: 880,
    density: 4430
  }
};

function performStressSimulation(
  material: MaterialProperties,
  loadConditions: LoadCondition[],
  geometry: Record<string, unknown>
): {
  maxStress: number;
  maxDisplacement: number;
  safetyFactor: number;
  failurePoints: Array<{
    location: { x: number; y: number; z: number };
    stress: number;
    mode: string;
  }>;
  visualizationData: Record<string, unknown>;
  predictedLifeCycles: number;
} {
  const appliedForce = loadConditions.reduce((sum, load) => sum + load.force, 0);
  const area = (geometry.cross_sectional_area as number) || 100;

  const nominalStress = appliedForce / area;

  const stressConcentrationFactor = (geometry.stress_concentration as number) || 2.5;
  const maxStress = nominalStress * stressConcentrationFactor;

  const length = (geometry.length as number) || 100;
  const momentOfInertia = (geometry.moment_of_inertia as number) || 1000;
  const maxDisplacement = (appliedForce * Math.pow(length, 3)) / (3 * material.youngs_modulus * momentOfInertia);

  const safetyFactor = material.yield_strength / maxStress;
  const stressRatio = maxStress / material.yield_strength;
  const predictedLifeCycles = Math.max(1000, Math.floor((1 / Math.max(stressRatio, 0.01)) * 250000));

  const failurePoints = [];

  if (maxStress > material.yield_strength * 0.6) {
    failurePoints.push({
      location: { x: 0, y: 0, z: length / 2 },
      stress: maxStress,
      mode: "Yielding - Material exceeds elastic limit"
    });
  }

  if ((geometry.has_sharp_corners as boolean) && maxStress > material.yield_strength * 0.4) {
    failurePoints.push({
      location: { x: 10, y: 5, z: 20 },
      stress: maxStress * 1.5,
      mode: "Stress Concentration - Sharp corner failure"
    });
  }

  if ((geometry.thin_section as boolean) && maxStress > material.yield_strength * 0.5) {
    failurePoints.push({
      location: { x: 25, y: 0, z: 50 },
      stress: maxStress * 1.3,
      mode: "Buckling - Thin section instability"
    });
  }

  const visualizationData = {
    mesh_nodes: 1000,
    stress_distribution: Array.from({ length: 50 }, (_, i) => ({
      position: i,
      stress: maxStress * (0.35 + (i / 80)),
      displacement: maxDisplacement * (0.2 + (i / 90))
    })),
    digital_twin_timeline: Array.from({ length: 10 }, (_, step) => {
      const loadScale = 0.8 + step * 0.08;
      const stepStress = maxStress * loadScale;
      const stepRatio = stepStress / material.yield_strength;
      return {
        step,
        load_scale: Number(loadScale.toFixed(3)),
        equivalent_stress: Number(stepStress.toFixed(3)),
        predicted_damage: Number(Math.min(1, stepRatio * 0.7).toFixed(4)),
      };
    }),
    color_map: "jet",
    min_stress: nominalStress * 0.5,
    max_stress: maxStress
  };

  return {
    maxStress,
    maxDisplacement,
    safetyFactor,
    failurePoints,
    visualizationData,
    predictedLifeCycles
  };
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    const authHeader = req.headers.get("Authorization") || req.headers.get("authorization") || "";
    const jwt = authHeader.replace(/^Bearer\s+/i, "").trim();

    if (!jwt) {
      throw new Error("Missing bearer token");
    }

    const { data: authData, error: authError } = await supabase.auth.getUser(jwt);
    if (authError || !authData.user) {
      throw new Error("Unauthorized request");
    }

    const { projectId, materialType = "aluminum_6061", force = 1000 } = await req.json();

    if (!projectId) {
      throw new Error("Project ID is required");
    }

    const { data: project, error: projectError } = await supabase
      .from("projects")
      .select("*")
      .eq("id", projectId)
      .eq("user_id", authData.user.id)
      .single();

    if (projectError || !project) {
      throw new Error("Project not found");
    }

    const material = materials[materialType] || materials.aluminum_6061;

    const loadConditions: LoadCondition[] = [
      {
        force: force,
        direction: "vertical",
        location: "center"
      }
    ];

    const extracted = ((project.metadata as Record<string, unknown>)?.extracted_geometry as Record<string, unknown>) || {};
    const dimensions = (extracted.dimensions as Record<string, unknown>) || {};
    const geometry = {
      cross_sectional_area: Number((project.metadata as Record<string, unknown>)?.cross_sectional_area || 120),
      length: Number(dimensions.x || (project.metadata as Record<string, unknown>)?.length || 180),
      moment_of_inertia: Number((project.metadata as Record<string, unknown>)?.moment_of_inertia || 950),
      stress_concentration: Number((project.metadata as Record<string, unknown>)?.stress_concentration || 2.1),
      has_sharp_corners: Boolean((project.metadata as Record<string, unknown>)?.sharp_corners ?? false),
      thin_section: Number(extracted.wall_thickness || 2) < 1.8,
      ...(project.metadata as Record<string, unknown>)
    };

    const simulationResults = performStressSimulation(material, loadConditions, geometry);

    const passed = simulationResults.safetyFactor >= 1.5 &&
                   simulationResults.maxStress < material.yield_strength;

    const { data: simulation, error: simulationError } = await supabase
      .from("simulation_results")
      .insert({
        project_id: projectId,
        simulation_type: "stress_analysis",
        load_conditions: {
          loads: loadConditions,
          boundary_conditions: "fixed_support"
        },
        material_properties: material,
        max_stress: simulationResults.maxStress,
        max_displacement: simulationResults.maxDisplacement,
        safety_factor: simulationResults.safetyFactor,
        failure_prediction: {
          points: simulationResults.failurePoints,
          critical_locations: simulationResults.failurePoints.length,
          predicted_life_cycles: simulationResults.predictedLifeCycles
        },
        visualization_data: simulationResults.visualizationData,
        passed: passed
      })
      .select()
      .single();

    if (simulationError || !simulation) {
      throw new Error("Failed to save simulation results");
    }

    await supabase
      .from("reports")
      .insert({
        project_id: projectId,
        report_type: "simulation_snapshot",
        format: "web",
        content: {
          simulation_id: simulation.id,
          passed,
          max_stress: simulationResults.maxStress,
          safety_factor: simulationResults.safetyFactor,
          predicted_life_cycles: simulationResults.predictedLifeCycles
        }
      });

    return new Response(
      JSON.stringify({
        success: true,
        simulationId: simulation.id,
        passed: passed,
        maxStress: simulationResults.maxStress,
        safetyFactor: simulationResults.safetyFactor,
        failurePoints: simulationResults.failurePoints.length,
        predictedLifeCycles: simulationResults.predictedLifeCycles
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Simulation error:", error);
    const message = (error as Error).message || "Unknown error";
    const status = message.toLowerCase().includes("unauthorized") || message.toLowerCase().includes("bearer")
      ? 401
      : 500;
    return new Response(
      JSON.stringify({ error: message }),
      {
        status,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
