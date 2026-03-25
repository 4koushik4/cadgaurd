import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { PDFDocument, StandardFonts, rgb } from "npm:pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

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

    const { projectId, format = "web" } = await req.json();
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
      throw new Error("Project not found for this user");
    }

    const { data: latestValidation } = await supabase
      .from("validations")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const { data: issues } = await supabase
      .from("issues")
      .select("*")
      .eq("project_id", projectId)
      .order("severity", { ascending: false })
      .order("created_at", { ascending: false });

    const { data: latestSimulation } = await supabase
      .from("simulation_results")
      .select("*")
      .eq("project_id", projectId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    const severityCount = (issues || []).reduce(
      (acc, issue) => {
        const level = String(issue.severity || "low");
        if (level in acc) {
          acc[level as keyof typeof acc] += 1;
        }
        return acc;
      },
      { critical: 0, high: 0, medium: 0, low: 0 }
    );

    const reportPayload = {
      project: {
        id: project.id,
        name: project.name,
        description: project.description,
        file_format: project.file_format,
        quality_score: project.quality_score,
        status: project.status,
        created_at: project.created_at,
      },
      validation: latestValidation || null,
      severity_count: severityCount,
      issues: issues || [],
      simulation: latestSimulation || null,
      generated_at: new Date().toISOString(),
    };

    const reportType = latestSimulation ? "combined_validation_simulation" : "validation_only";
    const normalizedFormat = String(format).toLowerCase() === "pdf" ? "pdf" : "web";
    const reportPath = `${authData.user.id}/${projectId}-${Date.now()}.${normalizedFormat === "pdf" ? "pdf" : "json"}`;

    let reportBlob: Blob;
    let contentType = "application/json";

    if (normalizedFormat === "pdf") {
      const pdfDoc = await PDFDocument.create();
      const page = pdfDoc.addPage([595, 842]);
      const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
      const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

      let y = 800;
      const lineGap = 16;
      const drawLine = (text: string, isBold = false, size = 10) => {
        page.drawText(text, {
          x: 45,
          y,
          size,
          font: isBold ? bold : font,
          color: rgb(0.11, 0.17, 0.26),
        });
        y -= lineGap;
      };

      drawLine("CADGuard AI - Validation Report", true, 18);
      y -= 4;
      drawLine(`Project: ${project.name}`, true);
      drawLine(`Format: ${project.file_format.toUpperCase()} | Quality Score: ${project.quality_score}`);
      drawLine(`Generated: ${new Date().toISOString()}`);
      y -= 4;

      drawLine("Severity Summary", true, 12);
      drawLine(`Critical: ${severityCount.critical}  High: ${severityCount.high}  Medium: ${severityCount.medium}  Low: ${severityCount.low}`);
      y -= 4;

      if (latestSimulation) {
        drawLine("Digital Twin Summary", true, 12);
        drawLine(`Max Stress: ${latestSimulation.max_stress} MPa`);
        drawLine(`Safety Factor: ${latestSimulation.safety_factor}`);
        drawLine(`Passed: ${latestSimulation.passed ? "Yes" : "No"}`);
        y -= 4;
      }

      drawLine("Top Issues", true, 12);
      for (const issue of (issues || []).slice(0, 12)) {
        if (y < 60) {
          break;
        }
        drawLine(`- [${String(issue.severity).toUpperCase()}] ${issue.title}`, true);
        drawLine(`  ${issue.description}`);
        const fixText = issue.ai_suggestion ? `  Suggestion: ${issue.ai_suggestion}` : "  Suggestion: Review DFM and structural guidelines.";
        drawLine(fixText);
      }

      const pdfBytes = await pdfDoc.save();
      reportBlob = new Blob([pdfBytes], { type: "application/pdf" });
      contentType = "application/pdf";
    } else {
      reportBlob = new Blob([JSON.stringify(reportPayload, null, 2)], {
        type: "application/json",
      });
      contentType = "application/json";
    }

    const { error: uploadError } = await supabase.storage
      .from("reports")
      .upload(reportPath, reportBlob, {
        contentType,
        upsert: false,
      });

    if (uploadError) {
      throw new Error(`Failed to upload report: ${uploadError.message}`);
    }

    const { data: reportUrlData } = supabase.storage.from("reports").getPublicUrl(reportPath);

    const { data: reportRecord, error: reportError } = await supabase
      .from("reports")
      .insert({
        project_id: projectId,
        validation_id: latestValidation?.id ?? null,
        report_type: reportType,
        format: normalizedFormat,
        file_url: reportUrlData.publicUrl,
        content: reportPayload,
      })
      .select("id, file_url, created_at")
      .single();

    if (reportError || !reportRecord) {
      throw new Error("Failed to save report record");
    }

    return new Response(
      JSON.stringify({
        success: true,
        reportId: reportRecord.id,
        reportUrl: reportRecord.file_url,
        generatedAt: reportRecord.created_at,
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("Report generation error:", error);
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
