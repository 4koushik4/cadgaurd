import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { AlertTriangle, AlertCircle, Info, CheckCircle, Lightbulb } from 'lucide-react';

interface Issue {
  id: string;
  rule_id: string;
  severity: string;
  category: string;
  title: string;
  description: string;
  measured_value: number | null;
  expected_value: number | null;
  unit: string;
  ai_explanation: string;
  ai_suggestion: string;
  status: string;
}

interface Validation {
  id: string;
  validation_type: string;
  status: string;
  total_issues: number;
  critical_issues: number;
  warnings: number;
  info_count: number;
  execution_time: number;
  created_at: string;
}

interface ValidationResultsProps {
  projectId: string;
}

export function ValidationResults({ projectId }: ValidationResultsProps) {
  const [validations, setValidations] = useState<Validation[]>([]);
  const [issues, setIssues] = useState<Issue[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSeverity, setSelectedSeverity] = useState<string | null>(null);

  useEffect(() => {
    loadValidationData();
  }, [projectId]);

  const loadValidationData = async () => {
    try {
      const { data: validationsData } = await supabase
        .from('validations')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      const { data: issuesData } = await supabase
        .from('issues')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setValidations(validationsData || []);
      setIssues(issuesData || []);
    } catch (error) {
      console.error('Error loading validation data:', error);
    } finally {
      setLoading(false);
    }
  };

  const getSeverityIcon = (severity: string) => {
    switch (severity) {
      case 'critical':
        return <AlertTriangle className="w-5 h-5 text-rose-300" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-300" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-amber-300" />;
      case 'low':
        return <Info className="w-5 h-5 text-cyan-300" />;
      default:
        return <Info className="w-5 h-5 text-slate-300" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-rose-500/12 border-rose-400/35';
      case 'high':
        return 'bg-orange-500/12 border-orange-400/35';
      case 'medium':
        return 'bg-amber-500/12 border-amber-400/35';
      case 'low':
        return 'bg-cyan-500/12 border-cyan-400/35';
      default:
        return 'bg-slate-700/25 border-slate-500/35';
    }
  };

  const filteredIssues = selectedSeverity
    ? issues.filter(issue => issue.severity === selectedSeverity)
    : issues;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-cyan-100/80">Loading validation results...</p>
      </div>
    );
  }

  if (validations.length === 0) {
    return (
      <div className="text-center py-12 glass-card rounded-lg border border-cyan-400/20">
        <CheckCircle className="w-16 h-16 text-cyan-300/70 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-100 mb-2">No validation data yet</h3>
        <p className="text-cyan-100/80">Click "Run Validation" to analyze this design</p>
      </div>
    );
  }

  const latestValidation = validations[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card border border-cyan-400/25 rounded-lg p-4">
          <p className="text-sm text-cyan-100/80 mb-1">Total Issues</p>
          <p className="text-2xl font-bold text-slate-100">{latestValidation.total_issues}</p>
        </div>
        <div className="glass-card bg-rose-500/12 border border-rose-400/30 rounded-lg p-4">
          <p className="text-sm text-rose-200 mb-1">Critical</p>
          <p className="text-2xl font-bold text-rose-100">{latestValidation.critical_issues}</p>
        </div>
        <div className="glass-card bg-amber-500/12 border border-amber-400/30 rounded-lg p-4">
          <p className="text-sm text-amber-200 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-amber-100">{latestValidation.warnings}</p>
        </div>
        <div className="glass-card bg-cyan-500/12 border border-cyan-400/30 rounded-lg p-4">
          <p className="text-sm text-cyan-200 mb-1">Info</p>
          <p className="text-2xl font-bold text-cyan-100">{latestValidation.info_count}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={() => setSelectedSeverity(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            selectedSeverity === null
              ? 'bg-cyan-500/70 text-white border border-cyan-300/45'
              : 'bg-slate-800/70 text-slate-200 hover:bg-slate-700 border border-slate-600/40'
          }`}
        >
          All Issues
        </button>
        {['critical', 'high', 'medium', 'low'].map((severity) => (
          <button
            key={severity}
            onClick={() => setSelectedSeverity(severity)}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition capitalize ${
              selectedSeverity === severity
                ? 'bg-cyan-500/70 text-white border border-cyan-300/45'
                : 'bg-slate-800/70 text-slate-200 hover:bg-slate-700 border border-slate-600/40'
            }`}
          >
            {severity}
          </button>
        ))}
      </div>

      <div className="space-y-4">
        {filteredIssues.map((issue) => (
          <div
            key={issue.id}
            className={`border rounded-lg p-6 ${getSeverityColor(issue.severity)}`}
          >
            <div className="flex items-start space-x-4">
              <div className="flex-shrink-0 mt-1">
                {getSeverityIcon(issue.severity)}
              </div>
              <div className="flex-1">
                <div className="flex items-center justify-between mb-2">
                  <h4 className="text-lg font-semibold text-slate-100">{issue.title}</h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-slate-900/50 text-slate-200 border border-slate-500/35">
                    {issue.category}
                  </span>
                </div>

                <p className="text-slate-200 mb-4">{issue.description}</p>

                {issue.measured_value !== null && issue.expected_value !== null && (
                  <div className="bg-slate-900/45 rounded-lg p-4 mb-4 border border-slate-600/30">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-300 mb-1">Measured Value</p>
                        <p className="text-lg font-bold text-rose-300">
                          {issue.measured_value} {issue.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-300 mb-1">Expected Value</p>
                        <p className="text-lg font-bold text-emerald-300">
                          {issue.expected_value} {issue.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {issue.ai_explanation && (
                  <div className="bg-cyan-500/12 border border-cyan-400/30 rounded-lg p-4 mb-3">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-cyan-300 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-cyan-100 mb-1">AI Explanation</h5>
                        <p className="text-cyan-100/90 text-sm">{issue.ai_explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {issue.ai_suggestion && (
                  <div className="bg-emerald-500/12 border border-emerald-400/30 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Lightbulb className="w-5 h-5 text-emerald-300 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-emerald-100 mb-1">Suggested Fix</h5>
                        <p className="text-emerald-100/90 text-sm">{issue.ai_suggestion}</p>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>

      {filteredIssues.length === 0 && (
        <div className="text-center py-12 glass-card rounded-lg border border-emerald-400/25">
          <CheckCircle className="w-16 h-16 text-emerald-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-100 mb-2">No issues found</h3>
          <p className="text-emerald-100/85">
            {selectedSeverity
              ? `No ${selectedSeverity} severity issues detected`
              : 'This design has passed all validation checks'}
          </p>
        </div>
      )}
    </div>
  );
}
