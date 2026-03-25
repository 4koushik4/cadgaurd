import { useState, useEffect, useRef } from 'react';
import { ArrowLeft, Play, AlertCircle, CheckCircle, Loader, Download, Bot, History } from 'lucide-react';
import { supabase } from '../lib/supabase';
import {
  runBackendAICopilot,
  runBackendAutoFix,
  runBackendSimulation,
  runBackendValidation,
  type BackendAICopilotResponse,
  type BackendAutoFixSuggestion,
} from '../lib/backendApi';
import { ValidationResults } from './ValidationResults';
import { SimulationView } from './SimulationView';
import { CADViewer } from './CADViewer';
import { useAppData } from '../contexts/AppDataContext';

interface Project {
  id: string;
  name: string;
  description: string;
  file_format: string;
  file_url: string;
  quality_score: number;
  status: string;
  created_at: string;
}

interface ViewerIssue {
  id: string;
  title: string;
  severity: string;
  location: Record<string, unknown>;
}

interface ProjectReport {
  id: string;
  report_type: string;
  format: string;
  file_url: string;
  created_at: string;
}

interface ToastState {
  type: 'success' | 'error';
  message: string;
}

interface HistoryPoint {
  id: string;
  quality_score: number;
  created_at: string;
  total_issues: number;
  high_issues: number;
}

interface CopilotInsight {
  summary: string;
  issues: string[];
  suggestions: string[];
  risks: string[];
}

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onUpdate: () => void;
  onValidationActivityChange?: (delta: number) => void;
}

export function ProjectDetails({ project, onBack, onUpdate, onValidationActivityChange }: ProjectDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'simulation' | '3d' | 'ai'>('overview');
  const [validating, setValidating] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [generatingReport, setGeneratingReport] = useState(false);
  const [viewerIssues, setViewerIssues] = useState<ViewerIssue[]>([]);
  const [reports, setReports] = useState<ProjectReport[]>([]);
  const [reportFormat, setReportFormat] = useState<'web' | 'pdf'>('web');
  const [toast, setToast] = useState<ToastState | null>(null);
  const [latestStressMap, setLatestStressMap] = useState<Array<{ x: number; y: number; z: number; stress: number }>>([]);
  const [selectedMaterial, setSelectedMaterial] = useState('aluminum_6061');
  const [operationProgress, setOperationProgress] = useState<{ label: string; value: number } | null>(null);
  const [history, setHistory] = useState<HistoryPoint[]>([]);
  const [copilotInsight, setCopilotInsight] = useState<CopilotInsight | null>(null);
  const [aiAnalyzing, setAIAnalyzing] = useState(false);
  const [autoFixLoading, setAutoFixLoading] = useState(false);
  const [autoFixSummary, setAutoFixSummary] = useState('');
  const [autoFixes, setAutoFixes] = useState<BackendAutoFixSuggestion[]>([]);
  const progressIntervalRef = useRef<number | null>(null);
  const { setAICopilotResult, addNotification, preferences } = useAppData();

  useEffect(() => {
    loadViewerIssues();
    loadReports();
    loadLatestStressMap();
    loadHistory();
    loadCopilotInsight();

    return () => {
      if (progressIntervalRef.current) {
        window.clearInterval(progressIntervalRef.current);
      }
    };
  }, [project.id]);

  const getAccessToken = async (): Promise<string> => {
    const { data } = await supabase.auth.getSession();
    const token = data.session?.access_token;
    if (!token) {
      throw new Error('No active session');
    }
    return token;
  };

  const showToast = (type: 'success' | 'error', message: string) => {
    setToast({ type, message });
    window.setTimeout(() => setToast(null), 3200);
  };

  const loadViewerIssues = async () => {
    const { data } = await supabase
      .from('issues')
      .select('id, title, severity, location')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(20);

    setViewerIssues((data || []) as ViewerIssue[]);
  };

  const loadReports = async () => {
    const { data } = await supabase
      .from('reports')
      .select('id, report_type, format, file_url, created_at')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(8);

    setReports((data || []) as ProjectReport[]);
  };

  const loadHistory = async () => {
    const { data } = await supabase
      .from('validations')
      .select('id, created_at, total_issues, critical_issues, warnings, info_count')
      .eq('project_id', project.id)
      .order('created_at', { ascending: true })
      .limit(30);

    const historyRows: HistoryPoint[] = (data || []).map((row) => {
      const high = row.critical_issues || 0;
      const medium = Math.max((row.warnings || 0) - high, 0);
      const low = row.info_count || 0;
      return {
        id: row.id,
        created_at: row.created_at,
        total_issues: row.total_issues || 0,
        high_issues: high,
        quality_score: Math.max(0, 100 - (high * 30 + medium * 15 + low * 5)),
      };
    });

    setHistory(historyRows);
  };

  const loadCopilotInsight = async () => {
    const { data } = await supabase
      .from('reports')
      .select('content')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const content = data?.content as {
      ai_copilot?: CopilotInsight;
      ai_insight?: { explanation?: string; suggestions?: string[] };
    };

    if (content?.ai_copilot?.summary) {
      setCopilotInsight(content.ai_copilot);
      setAICopilotResult(project.id, content.ai_copilot);
      return;
    }

    if (content?.ai_insight?.explanation) {
      const fallback: CopilotInsight = {
        summary: content.ai_insight.explanation,
        issues: [],
        suggestions: content.ai_insight.suggestions || [],
        risks: [],
      };
      setCopilotInsight(fallback);
      setAICopilotResult(project.id, fallback);
    } else {
      setCopilotInsight(null);
    }
  };

  const runCopilotAnalysis = async (
    validationResults: Record<string, unknown>,
    simulationResults: Record<string, unknown>,
    geometryStats: Record<string, unknown>
  ): Promise<BackendAICopilotResponse | null> => {
    setAIAnalyzing(true);
    setOperationProgress({ label: 'Analyzing design with AI...', value: 94 });
    try {
      const result = await runBackendAICopilot({
        validation_results: validationResults,
        simulation_results: simulationResults,
        geometry_stats: geometryStats,
      });

      const mapped: CopilotInsight = {
        summary: result.summary,
        issues: result.issues,
        suggestions: result.suggestions,
        risks: result.risks,
      };
      setCopilotInsight(mapped);
      setAICopilotResult(project.id, mapped);
      if (preferences.notify_ai_alerts) {
        await addNotification({
          type: 'ai_alert',
          title: 'AI Copilot Insight Ready',
          message: `AI analysis generated for ${project.name}`,
          level: 'info',
          metadata: { project_id: project.id },
        });
      }
      return result;
    } catch (error) {
      showToast('error', (error as Error).message || 'AI copilot analysis failed.');
      return null;
    } finally {
      setAIAnalyzing(false);
    }
  };

  const startProgress = (label: string) => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
    }
    setOperationProgress({ label, value: 8 });
    progressIntervalRef.current = window.setInterval(() => {
      setOperationProgress((current) => {
        if (!current) return current;
        const next = Math.min(92, current.value + Math.random() * 10);
        return { ...current, value: next };
      });
    }, 420);
  };

  const completeProgress = () => {
    if (progressIntervalRef.current) {
      window.clearInterval(progressIntervalRef.current);
      progressIntervalRef.current = null;
    }
    setOperationProgress((current) => (current ? { ...current, value: 100 } : null));
    window.setTimeout(() => setOperationProgress(null), 450);
  };

  const loadLatestStressMap = async () => {
    const { data } = await supabase
      .from('simulation_results')
      .select('visualization_data')
      .eq('project_id', project.id)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    const stressMap = (data?.visualization_data as { stress_map?: Array<{ x: number; y: number; z: number; stress: number }> })?.stress_map || [];
    setLatestStressMap(stressMap);
  };

  const handleRunValidation = async () => {
    setValidating(true);
    onValidationActivityChange?.(1);
    startProgress('Running validation');
    try {
      await getAccessToken();
      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No active user');

      await supabase
        .from('projects')
        .update({ status: 'processing' })
        .eq('id', project.id)
        .eq('user_id', userData.user.id);

      onUpdate();

      const payload = await runBackendValidation(project.file_url, project.file_format);
      const warningCount = payload.summary.high_issues + payload.summary.medium_issues;

      const { data: validationRow, error: validationInsertError } = await supabase
        .from('validations')
        .insert({
          project_id: project.id,
          validation_type: 'fastapi_hybrid',
          status: 'completed',
          total_issues: payload.summary.total_issues,
          critical_issues: payload.summary.high_issues,
          warnings: warningCount,
          info_count: payload.summary.low_issues,
          execution_time: 1.2,
        })
        .select('id')
        .single();

      if (validationInsertError || !validationRow) {
        throw new Error(validationInsertError?.message || 'Failed to store validation results');
      }

      if (payload.validation_issues.length > 0) {
        const issuesToInsert = payload.validation_issues.map((issue) => ({
          validation_id: validationRow.id,
          project_id: project.id,
          rule_id: issue.rule_id,
          severity: issue.severity,
          category: issue.rule_id.toLowerCase().includes('geometry') ? 'geometry' : 'structural',
          title: issue.rule_id.replace(/_/g, ' '),
          description: issue.explanation,
          measured_value: issue.measured_value ?? null,
          expected_value: issue.expected_value ?? null,
          unit: issue.unit ?? '',
          location: {},
          ai_explanation: payload.ai_insight.explanation,
          ai_suggestion: payload.ai_insight.suggestions.join(' '),
          status: 'open',
        }));

        const { error: issuesInsertError } = await supabase.from('issues').insert(issuesToInsert);
        if (issuesInsertError) {
          throw new Error(issuesInsertError.message);
        }
      }

      const { error: projectUpdateError } = await supabase
        .from('projects')
        .update({
          status: 'completed',
          quality_score: payload.summary.quality_score,
          metadata: {
            backend_source: 'fastapi',
            geometry: payload.geometry,
            ai_insight: payload.ai_insight,
            updated_at: new Date().toISOString(),
          },
        })
        .eq('id', project.id)
        .eq('user_id', userData.user.id);

      if (projectUpdateError) {
        throw new Error(projectUpdateError.message);
      }

      await supabase
        .from('reports')
        .insert({
          project_id: project.id,
          validation_id: validationRow.id,
          report_type: 'fastapi_validation',
          format: 'web',
          content: payload,
        });

      const aiCopilot = await runCopilotAnalysis(
        payload as unknown as Record<string, unknown>,
        {},
        payload.geometry as Record<string, unknown>
      );
      if (aiCopilot) {
        await supabase
          .from('reports')
          .insert({
            project_id: project.id,
            validation_id: validationRow.id,
            report_type: 'ai_copilot_validation',
            format: 'web',
            content: {
              ai_copilot: aiCopilot,
              source: 'validation',
            },
          });
      }

      showToast('success', `Validation complete. Quality score: ${payload.summary.quality_score}%`);

      if (preferences.notify_validation) {
        await addNotification({
          type: 'validation',
          title: 'Validation Completed',
          message: `${project.name} scored ${payload.summary.quality_score}% with ${payload.summary.total_issues} issues.`,
          level: payload.summary.high_issues > 0 ? 'warning' : 'success',
          metadata: { project_id: project.id },
        });
      }

      onUpdate();
      loadViewerIssues();
      loadReports();
      loadHistory();
      loadCopilotInsight();
      completeProgress();
    } catch (error) {
      console.error('Validation error:', error);
      showToast('error', (error as Error).message || 'Validation failed.');
      await supabase
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', project.id);
      onUpdate();
      completeProgress();
    } finally {
      setValidating(false);
      onValidationActivityChange?.(-1);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    onValidationActivityChange?.(1);
    startProgress('Running simulation');
    try {
      await getAccessToken();

      const { data: userData } = await supabase.auth.getUser();
      if (!userData.user) throw new Error('No active user');

      await supabase
        .from('projects')
        .update({ status: 'processing' })
        .eq('id', project.id)
        .eq('user_id', userData.user.id);

      onUpdate();

      const payload = await runBackendSimulation(project.file_url, project.file_format, selectedMaterial);

      const { error: simulationInsertError } = await supabase
        .from('simulation_results')
        .insert({
          project_id: project.id,
          simulation_type: 'fastapi_stress_analysis',
          load_conditions: {
            scenario: 'default_load_case',
          },
          material_properties: {
            model: selectedMaterial,
            source: 'material_selector',
          },
          max_stress: payload.simulation.max_stress,
          max_displacement: payload.simulation.avg_stress / 100,
          safety_factor: Number((250 / Math.max(payload.simulation.max_stress, 1)).toFixed(3)),
          failure_prediction: {
            weak_regions: payload.simulation.weak_regions,
            risk_level: payload.simulation.risk_level,
          },
          visualization_data: {
            stress_map: payload.simulation.stress_map,
            digital_twin_summary: payload.simulation.digital_twin_summary,
          },
          passed: payload.simulation.risk_level !== 'high',
        });

      if (simulationInsertError) {
        throw new Error(simulationInsertError.message);
      }

      await supabase
        .from('reports')
        .insert({
          project_id: project.id,
          report_type: 'fastapi_simulation',
          format: 'web',
          content: payload,
        });

      const { data: latestValidationReport } = await supabase
        .from('reports')
        .select('content')
        .eq('project_id', project.id)
        .eq('report_type', 'fastapi_validation')
        .order('created_at', { ascending: false })
        .limit(1)
        .maybeSingle();

      const aiCopilot = await runCopilotAnalysis(
        (latestValidationReport?.content as Record<string, unknown>) || {},
        payload as unknown as Record<string, unknown>,
        payload.geometry as Record<string, unknown>
      );
      if (aiCopilot) {
        await supabase
          .from('reports')
          .insert({
            project_id: project.id,
            report_type: 'ai_copilot_simulation',
            format: 'web',
            content: {
              ai_copilot: aiCopilot,
              source: 'simulation',
            },
          });
      }

      setLatestStressMap(payload.simulation.stress_map);
      showToast('success', `Simulation complete. Risk level: ${payload.simulation.risk_level.toUpperCase()}`);

      if (preferences.notify_simulation) {
        await addNotification({
          type: 'simulation',
          title: 'Simulation Completed',
          message: `${project.name} risk level: ${payload.simulation.risk_level.toUpperCase()}.`,
          level: payload.simulation.risk_level === 'high' ? 'warning' : 'success',
          metadata: { project_id: project.id },
        });
      }

      await supabase
        .from('projects')
        .update({ status: 'completed' })
        .eq('id', project.id)
        .eq('user_id', userData.user.id);

      onUpdate();
      loadReports();
      loadLatestStressMap();
      loadCopilotInsight();
      completeProgress();
      setActiveTab('simulation');
    } catch (error) {
      console.error('Simulation error:', error);
      showToast('error', (error as Error).message || 'Simulation failed.');
      await supabase
        .from('projects')
        .update({ status: 'failed' })
        .eq('id', project.id);
      onUpdate();
      completeProgress();
    } finally {
      setSimulating(false);
      onValidationActivityChange?.(-1);
    }
  };

  const handleGenerateReport = async () => {
    setGeneratingReport(true);
    try {
      await getAccessToken();
      const { data: payload, error } = await supabase.functions.invoke('generate-report', {
        body: { projectId: project.id, format: reportFormat }
      });

      if (error) throw new Error(`Report generation failed: ${error.message}`);

      if (payload?.reportUrl) {
        window.open(payload.reportUrl, '_blank', 'noopener,noreferrer');
      }
      loadReports();
      showToast('success', 'Report generated successfully.');
    } catch (error) {
      console.error('Report generation error:', error);
      showToast('error', (error as Error).message || 'Failed to generate report.');
    } finally {
      setGeneratingReport(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-emerald-300';
    if (score >= 60) return 'text-amber-300';
    return 'text-rose-300';
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'validation' as const, label: 'Validation Results' },
    { id: 'simulation' as const, label: 'Stress Simulation' },
    { id: '3d' as const, label: '3D Viewer' },
    { id: 'ai' as const, label: 'AI Copilot' },
  ];

  const handleAutoFix = async () => {
    setAutoFixLoading(true);
    try {
      const { data: issues } = await supabase
        .from('issues')
        .select('rule_id, description, measured_value, expected_value, unit')
        .eq('project_id', project.id)
        .order('created_at', { ascending: false })
        .limit(20);

      const payload = await runBackendAutoFix({
        validation_issues: (issues || []).map((issue) => ({
          rule_id: issue.rule_id,
          explanation: issue.description,
          measured_value: issue.measured_value,
          expected_value: issue.expected_value,
          unit: issue.unit,
        })),
      });

      setAutoFixSummary(payload.summary);
      setAutoFixes(payload.fixes);
    } catch (error) {
      showToast('error', (error as Error).message || 'Failed to generate auto-fix suggestions.');
    } finally {
      setAutoFixLoading(false);
    }
  };

  return (
    <div>
      {toast && (
        <div className={`fixed top-6 right-6 z-50 px-4 py-3 rounded-lg border backdrop-blur-xl shadow-2xl ${
          toast.type === 'success'
            ? 'bg-emerald-500/20 border-emerald-400 text-emerald-100'
            : 'bg-red-500/20 border-red-400 text-red-100'
        }`}>
          {toast.message}
        </div>
      )}

      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-cyan-300 hover:text-cyan-200 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-white mb-2">{project.name}</h2>
            {project.description && (
              <p className="text-slate-300 mb-4">{project.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-slate-300">
                Format: <span className="font-medium text-white">{project.file_format.toUpperCase()}</span>
              </span>
              <span className="text-slate-300">
                Uploaded: <span className="font-medium text-white">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className={`font-semibold ${getQualityColor(project.quality_score)}`}>
                Quality Score: {project.quality_score}%
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={selectedMaterial}
              onChange={(e) => setSelectedMaterial(e.target.value)}
              className="px-3 py-2 border border-emerald-400/30 bg-slate-900/80 text-emerald-200 rounded-lg text-sm"
            >
              <option value="aluminum_6061">Aluminum 6061</option>
              <option value="steel_a36">Steel A36</option>
              <option value="titanium_ti6al4v">Titanium Ti-6Al-4V</option>
              <option value="abs">ABS</option>
              <option value="pla">PLA</option>
            </select>

            <button
              onClick={handleRunValidation}
              disabled={validating}
              className="flex items-center space-x-2 bg-cyan-500/20 hover:bg-cyan-400/25 text-cyan-200 px-4 py-2 rounded-lg border border-cyan-400/40 shadow-[0_0_24px_rgba(0,240,255,0.25)] transition disabled:opacity-50"
            >
              {validating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Validating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Validation</span>
                </>
              )}
            </button>

            <button
              onClick={handleRunSimulation}
              disabled={simulating}
              className="flex items-center space-x-2 bg-fuchsia-500/20 hover:bg-fuchsia-400/25 text-fuchsia-200 px-4 py-2 rounded-lg border border-fuchsia-400/40 shadow-[0_0_24px_rgba(255,0,200,0.22)] transition disabled:opacity-50"
            >
              {simulating ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Simulating...</span>
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  <span>Run Simulation</span>
                </>
              )}
            </button>

            <button
              onClick={handleGenerateReport}
              disabled={generatingReport}
              className="flex items-center space-x-2 bg-violet-500/20 hover:bg-violet-400/25 text-violet-200 px-4 py-2 rounded-lg border border-violet-400/40 shadow-[0_0_24px_rgba(138,46,255,0.22)] transition disabled:opacity-50"
            >
              {generatingReport ? (
                <>
                  <Loader className="w-4 h-4 animate-spin" />
                  <span>Generating...</span>
                </>
              ) : (
                <>
                  <Download className="w-4 h-4" />
                  <span>Generate Report</span>
                </>
              )}
            </button>

            <select
              value={reportFormat}
              onChange={(e) => setReportFormat(e.target.value as 'web' | 'pdf')}
              className="px-3 py-2 border border-cyan-400/30 bg-slate-900/80 text-slate-200 rounded-lg text-sm"
            >
              <option value="web">Web JSON</option>
              <option value="pdf">PDF</option>
            </select>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-700 mb-6">
        {operationProgress && (
          <div className="mb-5 rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-3">
            <div className="flex items-center justify-between text-xs text-cyan-100 mb-2">
              <span>{operationProgress.label}</span>
              <span>{Math.round(operationProgress.value)}%</span>
            </div>
            <div className="h-2 rounded bg-slate-900/80 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-cyan-400 to-fuchsia-400 transition-all duration-300"
                style={{ width: `${operationProgress.value}%` }}
              />
            </div>
          </div>
        )}

        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-cyan-400 text-cyan-300'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {activeTab === 'overview' && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="bg-slate-900/60 border border-cyan-400/25 rounded-lg p-6 backdrop-blur-lg">
                <CheckCircle className="w-8 h-8 text-cyan-300 mb-3" />
                <h4 className="font-semibold text-white mb-1">AI Validation Engine</h4>
                <p className="text-sm text-slate-300">
                  Uses FastAPI + deterministic rules + Groq reasoning.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-fuchsia-400/25 rounded-lg p-6 backdrop-blur-lg">
                <AlertCircle className="w-8 h-8 text-fuchsia-300 mb-3" />
                <h4 className="font-semibold text-white mb-1">Stress Simulation</h4>
                <p className="text-sm text-slate-300">
                  Generates a real stress map and weak-region analysis.
                </p>
              </div>

              <div className="bg-slate-900/60 border border-violet-400/25 rounded-lg p-6 backdrop-blur-lg">
                <Download className="w-8 h-8 text-violet-300 mb-3" />
                <h4 className="font-semibold text-white mb-1">Reports</h4>
                <p className="text-sm text-slate-300">
                  Export simulation and validation snapshots instantly.
                </p>
              </div>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <h3 className="font-semibold text-white mb-3">Project Information</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-400 mb-1">File Name</dt>
                  <dd className="text-slate-100 font-medium">{project.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 mb-1">Format</dt>
                  <dd className="text-slate-100 font-medium">{project.file_format.toUpperCase()}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 mb-1">Status</dt>
                  <dd className="text-slate-100 font-medium capitalize">{project.status}</dd>
                </div>
                <div>
                  <dt className="text-slate-400 mb-1">Created</dt>
                  <dd className="text-slate-100 font-medium">
                    {new Date(project.created_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-slate-700">
              <h3 className="font-semibold text-white mb-3">Recent Reports</h3>
              {reports.length === 0 ? (
                <p className="text-sm text-slate-400">No reports generated yet.</p>
              ) : (
                <div className="space-y-2">
                  {reports.map((report) => (
                    <a
                      key={report.id}
                      href={report.file_url}
                      target="_blank"
                      rel="noreferrer"
                      className="flex items-center justify-between px-3 py-2 bg-slate-900/70 border border-slate-700 rounded-lg hover:border-cyan-400/40 transition"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-100">{report.report_type.replace(/_/g, ' ')}</p>
                        <p className="text-xs text-slate-400">{new Date(report.created_at).toLocaleString()}</p>
                      </div>
                      <span className="text-xs uppercase text-cyan-300">{report.format}</span>
                    </a>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-cyan-400/25">
              <div className="flex items-center gap-2 mb-3">
                <Bot className="w-5 h-5 text-cyan-300" />
                <h3 className="font-semibold text-white">AI Design Copilot</h3>
              </div>
              {aiAnalyzing && (
                <p className="text-sm text-cyan-200 mb-3">Analyzing design with AI...</p>
              )}
              {copilotInsight ? (
                <>
                  <p className="text-sm text-slate-200 mb-3">{copilotInsight.summary}</p>
                  <ul className="space-y-2 text-sm text-rose-100 mb-3">
                    {copilotInsight.issues.map((issue, index) => (
                      <li key={`${index}-${issue}`} className="px-3 py-2 rounded bg-slate-900/60 border border-rose-400/20">
                        {issue}
                      </li>
                    ))}
                  </ul>
                  <ul className="space-y-2 text-sm text-cyan-100">
                    {copilotInsight.suggestions.map((suggestion, index) => (
                      <li key={`${index}-${suggestion}`} className="px-3 py-2 rounded bg-slate-900/60 border border-cyan-400/20">
                        {suggestion}
                      </li>
                    ))}
                  </ul>
                </>
              ) : (
                <p className="text-sm text-slate-400">Run validation or simulation to receive AI optimization guidance.</p>
              )}
            </div>

            <div className="bg-slate-900/50 rounded-lg p-6 border border-violet-400/25">
              <div className="flex items-center gap-2 mb-3">
                <History className="w-5 h-5 text-violet-300" />
                <h3 className="font-semibold text-white">Design History Timeline</h3>
              </div>
              {history.length === 0 ? (
                <p className="text-sm text-slate-400">No history yet. Run validation to begin tracking improvements over time.</p>
              ) : (
                <div className="space-y-2">
                  {history.map((point) => (
                    <div key={point.id} className="flex items-center justify-between text-sm px-3 py-2 rounded bg-slate-900/65 border border-slate-700">
                      <span className="text-slate-200">{new Date(point.created_at).toLocaleString()}</span>
                      <span className="text-cyan-200">Quality {point.quality_score}%</span>
                      <span className="text-rose-200">High issues {point.high_issues}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {activeTab === 'validation' && (
          <ValidationResults projectId={project.id} />
        )}

        {activeTab === 'simulation' && (
          <SimulationView projectId={project.id} />
        )}

        {activeTab === '3d' && (
          <CADViewer fileUrl={project.file_url} fileFormat={project.file_format} issues={viewerIssues} stressMap={latestStressMap} />
        )}

        {activeTab === 'ai' && (
          <div className="glass-card rounded-xl border border-cyan-400/25 p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-semibold text-white">AI Copilot Analysis</h3>
              <button
                onClick={handleAutoFix}
                disabled={autoFixLoading}
                className="px-3 py-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-100 text-sm disabled:opacity-50"
              >
                {autoFixLoading ? 'Generating fixes...' : 'Generate Auto Fix Plan'}
              </button>
            </div>
            {aiAnalyzing && <p className="text-cyan-200 mb-3">Analyzing design with AI...</p>}
            {copilotInsight ? (
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-300 mb-1">Summary</p>
                  <p className="text-slate-100">{copilotInsight.summary}</p>
                </div>
                <div>
                  <p className="text-sm text-rose-200 mb-1">Issues</p>
                  <ul className="space-y-1 text-sm text-rose-100">
                    {copilotInsight.issues.map((item, index) => (
                      <li key={`${index}-${item}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-cyan-200 mb-1">Suggestions</p>
                  <ul className="space-y-1 text-sm text-slate-200">
                    {copilotInsight.suggestions.map((item, index) => (
                      <li key={`${index}-${item}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <p className="text-sm text-amber-200 mb-1">Risk Warnings</p>
                  <ul className="space-y-1 text-sm text-amber-100">
                    {copilotInsight.risks.map((item, index) => (
                      <li key={`${index}-${item}`}>• {item}</li>
                    ))}
                  </ul>
                </div>
              </div>
            ) : (
              <p className="text-slate-400">No AI analysis yet. Run validation and simulation to generate dynamic recommendations.</p>
            )}

            {(autoFixSummary || autoFixes.length > 0) && (
              <div className="mt-6 rounded-xl border border-emerald-400/30 bg-emerald-500/10 p-4">
                <p className="text-sm text-emerald-100 mb-2">{autoFixSummary || 'Auto-fix suggestions'}</p>
                <div className="space-y-2">
                  {autoFixes.map((fix, idx) => (
                    <div key={`${idx}-${fix.issue}`} className="rounded-lg border border-emerald-300/25 bg-slate-950/60 p-3 text-sm">
                      <p className="text-slate-100">{fix.issue}</p>
                      <p className="text-slate-300">Cause: {fix.probable_cause}</p>
                      <p className="text-emerald-200">Fix: {fix.recommended_fix}</p>
                      {fix.target_value && <p className="text-cyan-200">Target: {fix.target_value}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
