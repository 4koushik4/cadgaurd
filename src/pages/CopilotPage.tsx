import { useEffect, useState } from 'react';
import { Bot, Lightbulb, AlertTriangle, BrainCircuit } from 'lucide-react';
import { supabase } from '../lib/supabase';
import type { AICopilotResponse } from '../types/domain';

interface CopilotRow {
  id: string;
  project_id: string;
  created_at: string;
  content: {
    ai_copilot?: AICopilotResponse;
    ai_insight?: { explanation: string; suggestions: string[] };
  };
}

export function CopilotPage() {
  const [rows, setRows] = useState<CopilotRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('reports')
          .select('id, project_id, created_at, content')
          .order('created_at', { ascending: false })
          .limit(12);
        setRows((data || []) as CopilotRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  if (loading) {
    return <p className="text-slate-300">Loading AI insights...</p>;
  }

  return (
    <div className="space-y-4">
      <div className="glass-card rounded-xl border border-cyan-400/30 p-6">
        <div className="flex items-center gap-2 mb-2">
          <Bot className="w-5 h-5 text-cyan-300" />
          <h2 className="text-xl font-semibold text-white">AI Design Copilot</h2>
        </div>
        <p className="text-sm text-slate-300">Latest cross-project AI engineering analysis generated from validation and simulation data.</p>
      </div>

      {rows.length === 0 ? (
        <div className="glass-card rounded-xl border border-slate-700 p-6 text-slate-400 text-sm">
          No AI analyses yet. Run validation and simulation on projects to generate dynamic copilot insights.
        </div>
      ) : (
        rows.map((row) => {
          const copilot = row.content?.ai_copilot;
          const fallback = row.content?.ai_insight;
          return (
            <div key={row.id} className="glass-card rounded-xl border border-slate-700 p-6">
              <p className="text-xs text-slate-400 mb-2">Project {row.project_id} • {new Date(row.created_at).toLocaleString()}</p>
              {copilot ? (
                <>
                  <div className="flex items-start gap-2 mb-3">
                    <BrainCircuit className="w-5 h-5 text-violet-300 mt-0.5" />
                    <p className="text-slate-100 text-sm">{copilot.summary}</p>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-cyan-200 mb-2">Issues</p>
                      <ul className="space-y-1 text-sm text-slate-200">
                        {copilot.issues.map((item, idx) => <li key={idx}>• {item}</li>)}
                      </ul>
                    </div>
                    <div>
                      <p className="text-sm text-emerald-200 mb-2">Suggestions</p>
                      <ul className="space-y-1 text-sm text-slate-200">
                        {copilot.suggestions.map((item, idx) => (
                          <li key={idx} className="flex gap-2"><Lightbulb className="w-4 h-4 text-emerald-300 mt-0.5" /><span>{item}</span></li>
                        ))}
                      </ul>
                    </div>
                  </div>
                  <div className="mt-3">
                    <p className="text-sm text-rose-200 mb-2">Risk Warnings</p>
                    <ul className="space-y-1 text-sm text-rose-100">
                      {copilot.risks.map((item, idx) => (
                        <li key={idx} className="flex gap-2"><AlertTriangle className="w-4 h-4 mt-0.5" /><span>{item}</span></li>
                      ))}
                    </ul>
                  </div>
                </>
              ) : fallback ? (
                <>
                  <p className="text-slate-100 text-sm mb-3">{fallback.explanation}</p>
                  <ul className="space-y-1 text-sm text-emerald-100">
                    {fallback.suggestions.map((item, idx) => <li key={idx}>• {item}</li>)}
                  </ul>
                </>
              ) : (
                <p className="text-slate-400 text-sm">No structured AI insight in this report payload.</p>
              )}
            </div>
          );
        })
      )}
    </div>
  );
}
