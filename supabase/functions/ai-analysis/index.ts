import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface Issue {
  id: string;
  title: string;
  description: string;
  severity: string;
  category: string;
  measured_value: number | null;
  expected_value: number | null;
  unit: string;
}

async function callOpenAI(prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: [
          {
            role: "system",
            content: "You are an expert CAD design validation assistant. Provide clear, actionable explanations and suggestions for design issues."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      throw new Error("OpenAI API call failed");
    }

    const data = await response.json();
    return data.choices[0].message.content;
  } catch (error) {
    console.error("OpenAI error:", error);
    return "";
  }
}

async function callGroq(prompt: string, apiKey: string): Promise<string> {
  try {
    const response = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "llama-3.3-70b-versatile",
        messages: [
          {
            role: "system",
            content: "You are an expert CAD design validation assistant. Provide clear, actionable explanations and suggestions for design issues."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        max_tokens: 300,
        temperature: 0.6,
      }),
    });

    if (!response.ok) {
      throw new Error("Groq API call failed");
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || "";
  } catch (error) {
    console.error("Groq error:", error);
    return "";
  }
}

function generateFallbackExplanation(issue: Issue): string {
  const explanations: Record<string, string> = {
    "Insufficient Wall Thickness": "Thin walls may not withstand applied loads and can lead to part deformation or failure. This is especially critical in structural components where safety is paramount. Manufacturing processes may also struggle with very thin sections.",
    "Inadequate Hole Spacing": "When holes are too close together, the material between them experiences higher stress levels. This creates a stress concentration that can initiate cracks and lead to premature failure, especially under cyclic loading.",
    "Sharp Corners Detected": "Sharp corners create stress concentration points where forces accumulate. During manufacturing, sharp corners are also difficult to produce consistently and may require additional machining operations.",
    "Small Fillet Radius": "Small fillets don't adequately distribute stress around corners. Larger fillets improve load distribution, reduce stress concentration factors, and make parts easier to manufacture using standard tooling.",
    "Insufficient Draft Angle": "Draft angles facilitate part removal from molds or machining fixtures. Without adequate draft, parts may stick, warp during removal, or require more complex manufacturing processes.",
    "Undercuts Detected": "Undercuts prevent straightforward part ejection from molds and complicate machining. They typically require side-actions, lifters, or additional operations, significantly increasing manufacturing cost and complexity.",
    "High Aspect Ratio": "Parts with high length-to-width ratios are prone to deflection under load, vibration, and buckling. They may also be difficult to machine or handle during manufacturing without special fixturing."
  };

  return explanations[issue.title] || "This design feature may impact structural integrity or manufacturability. Review the specific measurements and consider the intended use case.";
}

function generateFallbackSuggestion(issue: Issue): string {
  const suggestions: Record<string, string> = {
    "Insufficient Wall Thickness": "Increase wall thickness to at least 2mm. Consider adding ribs or gussets for additional support if weight is a concern. Review the load requirements and material properties to determine optimal thickness.",
    "Inadequate Hole Spacing": "Increase spacing between holes to at least 5mm edge-to-edge. If closer spacing is required, consider using reinforcement around the holes or choosing a stronger material.",
    "Sharp Corners Detected": "Add fillets with minimum 2mm radius to all internal corners. For external corners, consider chamfers. This will improve both structural performance and manufacturability.",
    "Small Fillet Radius": "Increase fillet radii to at least 1-2mm. Larger radii (3-5mm) are better for high-stress applications. Use stress analysis to determine optimal radii for critical areas.",
    "Insufficient Draft Angle": "Add 2-5 degrees of draft to all vertical faces. Deep pockets or tall features may require more draft. Consult with your manufacturer for specific requirements.",
    "Undercuts Detected": "Redesign to eliminate undercuts where possible. If undercuts are necessary, ensure they're accessible for machining or that your manufacturer has the appropriate mold technology.",
    "High Aspect Ratio": "Consider redesigning to reduce the length-to-width ratio below 10:1. Add intermediate supports, increase cross-sectional dimensions, or divide into multiple components."
  };

  return suggestions[issue.title] || "Review design requirements and consider alternative geometries. Consult with manufacturing engineers for feasibility assessment.";
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

    const { validationId, useAI = false } = await req.json();

    if (!validationId) {
      throw new Error("Validation ID is required");
    }

    const { data: validationRow, error: validationError } = await supabase
      .from("validations")
      .select("id, project_id, projects!inner(user_id)")
      .eq("id", validationId)
      .eq("projects.user_id", authData.user.id)
      .single();

    if (validationError || !validationRow) {
      throw new Error("Validation not found for this user");
    }

    const { data: issues, error: issuesError } = await supabase
      .from("issues")
      .select("*")
      .eq("validation_id", validationId);

    if (issuesError || !issues) {
      throw new Error("Failed to fetch issues");
    }

    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");
    const groqApiKey = Deno.env.get("GROQ_API_KEY");
    const canUseAI = useAI && Boolean(openaiApiKey || groqApiKey);

    for (const issue of issues) {
      let explanation = "";
      let suggestion = "";

      if (canUseAI) {
        const explanationPrompt = `
Issue: ${issue.title}
Description: ${issue.description}
${issue.measured_value ? `Measured: ${issue.measured_value} ${issue.unit}` : ""}
${issue.expected_value ? `Expected: ${issue.expected_value} ${issue.unit}` : ""}

      Explain in 2-3 concise sentences why this is risky for CAD design quality, including impact on structural integrity, manufacturability, or assembly reliability.
`;

        const suggestionPrompt = `
Issue: ${issue.title}
Description: ${issue.description}
${issue.measured_value ? `Measured: ${issue.measured_value} ${issue.unit}` : ""}
${issue.expected_value ? `Expected: ${issue.expected_value} ${issue.unit}` : ""}

Provide a specific, actionable fix in 2-3 sentences. Include numerical recommendations where applicable.
`;

        if (openaiApiKey) {
          explanation = await callOpenAI(explanationPrompt, openaiApiKey);
          suggestion = await callOpenAI(suggestionPrompt, openaiApiKey);
        } else if (groqApiKey) {
          explanation = await callGroq(explanationPrompt, groqApiKey);
          suggestion = await callGroq(suggestionPrompt, groqApiKey);
        }
      }

      if (!explanation) {
        explanation = generateFallbackExplanation(issue);
      }

      if (!suggestion) {
        suggestion = generateFallbackSuggestion(issue);
      }

      await supabase
        .from("issues")
        .update({
          ai_explanation: explanation,
          ai_suggestion: suggestion
        })
        .eq("id", issue.id);

      const { data: historyRow } = await supabase
        .from("design_history")
        .select("id, usage_count")
        .eq("user_id", authData.user.id)
        .eq("issue_pattern", issue.title)
        .maybeSingle();

      if (historyRow) {
        await supabase
          .from("design_history")
          .update({
            usage_count: Number(historyRow.usage_count || 0) + 1,
            fix_applied: suggestion,
            metadata: {
              severity: issue.severity,
              auto_generated: true,
              last_validation_id: validationRow.id,
              last_updated_at: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq("id", historyRow.id);
      } else {
        await supabase
          .from("design_history")
          .insert({
            user_id: authData.user.id,
            issue_pattern: issue.title,
            fix_applied: suggestion,
            success_rate: 0.85,
            usage_count: 1,
            category: issue.category,
            metadata: {
              severity: issue.severity,
              auto_generated: true,
              source_validation_id: validationRow.id
            }
          });
      }
    }

    return new Response(
      JSON.stringify({
        success: true,
        processedIssues: issues.length,
        aiEnabled: canUseAI
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error("AI analysis error:", error);
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
