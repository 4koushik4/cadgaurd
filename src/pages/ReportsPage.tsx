import { useEffect, useState } from 'react';
import { Download, FileSpreadsheet } from 'lucide-react';
import { supabase } from '../lib/supabase';

interface ReportRow {
  id: string;
  report_type: string;
  format: string;
  file_url: string;
  created_at: string;
  project_id: string;
  content: Record<string, unknown>;
}

export function ReportsPage() {
  const [rows, setRows] = useState<ReportRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [exportingPdfId, setExportingPdfId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await supabase
          .from('reports')
          .select('id, report_type, format, file_url, created_at, project_id, content')
          .order('created_at', { ascending: false })
          .limit(50);
        setRows((data || []) as ReportRow[]);
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const downloadJson = (row: ReportRow) => {
    const blob = new Blob([JSON.stringify(row.content || {}, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `${row.report_type}-${row.id}.json`;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  };

  const exportPdf = async (row: ReportRow) => {
    setExportingPdfId(row.id);
    try {
      const { data, error } = await supabase.functions.invoke('generate-report', {
        body: { projectId: row.project_id, format: 'pdf' },
      });

      if (error) throw new Error(error.message);
      if (data?.reportUrl) {
        window.open(data.reportUrl, '_blank', 'noopener,noreferrer');
      }
    } catch (error) {
      console.error('PDF export failed', error);
    } finally {
      setExportingPdfId(null);
    }
  };

  return (
    <div className="glass-card rounded-xl border border-slate-700/70 p-6">
      <div className="flex items-center gap-2 mb-4">
        <FileSpreadsheet className="w-5 h-5 text-violet-300" />
        <h2 className="text-xl font-semibold text-white">Reports</h2>
      </div>

      {loading ? (
        <p className="text-slate-300">Loading reports...</p>
      ) : rows.length === 0 ? (
        <p className="text-slate-400 text-sm">No reports generated yet.</p>
      ) : (
        <div className="space-y-2">
          {rows.map((report) => (
            <div
              key={report.id}
              className="rounded-lg border border-slate-700/70 bg-slate-900/50 px-3 py-3 hover:border-cyan-400/35 transition"
            >
              <div className="flex items-center justify-between gap-4">
                <p className="text-sm font-medium text-slate-100">{report.report_type.replace(/_/g, ' ')}</p>
                <p className="text-xs text-slate-400">Project {report.project_id} • {new Date(report.created_at).toLocaleString()}</p>
                <div className="flex items-center gap-2 text-cyan-200">
                  <span className="text-xs uppercase">{report.format}</span>
                  <button onClick={() => downloadJson(report)} className="px-2 py-1 rounded border border-cyan-400/35 text-xs">JSON</button>
                  <button onClick={() => void exportPdf(report)} className="px-2 py-1 rounded border border-violet-400/35 text-xs">
                    {exportingPdfId === report.id ? 'Generating...' : 'PDF'}
                  </button>
                  {report.file_url && (
                    <a href={report.file_url} target="_blank" rel="noreferrer" className="p-1">
                      <Download className="w-4 h-4" />
                    </a>
                  )}
                </div>
              </div>

              <div className="mt-3 grid grid-cols-1 md:grid-cols-4 gap-2 text-xs">
                <div className="rounded border border-slate-700/70 bg-slate-950/60 p-2">
                  <p className="text-slate-400 mb-1">Summary</p>
                  <p className="text-slate-200">{String((report.content?.ai_copilot as { summary?: string })?.summary || (report.content?.ai_insight as { explanation?: string })?.explanation || 'Structured report available')}</p>
                </div>
                <div className="rounded border border-slate-700/70 bg-slate-950/60 p-2">
                  <p className="text-slate-400 mb-1">Issues</p>
                  <p className="text-slate-200">{Array.isArray((report.content?.validation_issues as unknown[])) ? (report.content?.validation_issues as unknown[]).length : '-'}</p>
                </div>
                <div className="rounded border border-slate-700/70 bg-slate-950/60 p-2">
                  <p className="text-slate-400 mb-1">Simulation</p>
                  <p className="text-slate-200">{String((report.content?.simulation as { risk_level?: string })?.risk_level || 'n/a')}</p>
                </div>
                <div className="rounded border border-slate-700/70 bg-slate-950/60 p-2">
                  <p className="text-slate-400 mb-1">AI Suggestions</p>
                  <p className="text-slate-200">{Array.isArray((report.content?.ai_copilot as { suggestions?: string[] })?.suggestions) ? (report.content?.ai_copilot as { suggestions?: string[] }).suggestions?.length : Array.isArray((report.content?.ai_insight as { suggestions?: string[] })?.suggestions) ? (report.content?.ai_insight as { suggestions?: string[] }).suggestions?.length : 0}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
