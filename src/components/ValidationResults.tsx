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
        return <AlertTriangle className="w-5 h-5 text-red-600" />;
      case 'high':
        return <AlertCircle className="w-5 h-5 text-orange-600" />;
      case 'medium':
        return <AlertCircle className="w-5 h-5 text-yellow-600" />;
      case 'low':
        return <Info className="w-5 h-5 text-blue-600" />;
      default:
        return <Info className="w-5 h-5 text-slate-600" />;
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity) {
      case 'critical':
        return 'bg-red-50 border-red-200';
      case 'high':
        return 'bg-orange-50 border-orange-200';
      case 'medium':
        return 'bg-yellow-50 border-yellow-200';
      case 'low':
        return 'bg-blue-50 border-blue-200';
      default:
        return 'bg-slate-50 border-slate-200';
    }
  };

  const filteredIssues = selectedSeverity
    ? issues.filter(issue => issue.severity === selectedSeverity)
    : issues;

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading validation results...</p>
      </div>
    );
  }

  if (validations.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <CheckCircle className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No validation data yet</h3>
        <p className="text-slate-600">Click "Run Validation" to analyze this design</p>
      </div>
    );
  }

  const latestValidation = validations[0];

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="text-sm text-slate-600 mb-1">Total Issues</p>
          <p className="text-2xl font-bold text-slate-900">{latestValidation.total_issues}</p>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-4">
          <p className="text-sm text-red-600 mb-1">Critical</p>
          <p className="text-2xl font-bold text-red-900">{latestValidation.critical_issues}</p>
        </div>
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
          <p className="text-sm text-yellow-600 mb-1">Warnings</p>
          <p className="text-2xl font-bold text-yellow-900">{latestValidation.warnings}</p>
        </div>
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <p className="text-sm text-blue-600 mb-1">Info</p>
          <p className="text-2xl font-bold text-blue-900">{latestValidation.info_count}</p>
        </div>
      </div>

      <div className="flex items-center space-x-2 mb-4">
        <button
          onClick={() => setSelectedSeverity(null)}
          className={`px-4 py-2 rounded-lg text-sm font-medium transition ${
            selectedSeverity === null
              ? 'bg-blue-600 text-white'
              : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                ? 'bg-blue-600 text-white'
                : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
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
                  <h4 className="text-lg font-semibold text-slate-900">{issue.title}</h4>
                  <span className="px-3 py-1 rounded-full text-xs font-medium bg-white text-slate-700 border border-slate-300">
                    {issue.category}
                  </span>
                </div>

                <p className="text-slate-700 mb-4">{issue.description}</p>

                {issue.measured_value !== null && issue.expected_value !== null && (
                  <div className="bg-white rounded-lg p-4 mb-4 border border-slate-200">
                    <div className="grid grid-cols-2 gap-4 text-sm">
                      <div>
                        <p className="text-slate-600 mb-1">Measured Value</p>
                        <p className="text-lg font-bold text-red-600">
                          {issue.measured_value} {issue.unit}
                        </p>
                      </div>
                      <div>
                        <p className="text-slate-600 mb-1">Expected Value</p>
                        <p className="text-lg font-bold text-green-600">
                          {issue.expected_value} {issue.unit}
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                {issue.ai_explanation && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-3">
                    <div className="flex items-start space-x-3">
                      <Info className="w-5 h-5 text-blue-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-blue-900 mb-1">AI Explanation</h5>
                        <p className="text-blue-800 text-sm">{issue.ai_explanation}</p>
                      </div>
                    </div>
                  </div>
                )}

                {issue.ai_suggestion && (
                  <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                    <div className="flex items-start space-x-3">
                      <Lightbulb className="w-5 h-5 text-green-600 flex-shrink-0 mt-0.5" />
                      <div>
                        <h5 className="font-semibold text-green-900 mb-1">Suggested Fix</h5>
                        <p className="text-green-800 text-sm">{issue.ai_suggestion}</p>
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
        <div className="text-center py-12 bg-slate-50 rounded-lg">
          <CheckCircle className="w-16 h-16 text-green-500 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-slate-900 mb-2">No issues found</h3>
          <p className="text-slate-600">
            {selectedSeverity
              ? `No ${selectedSeverity} severity issues detected`
              : 'This design has passed all validation checks'}
          </p>
        </div>
      )}
    </div>
  );
}
