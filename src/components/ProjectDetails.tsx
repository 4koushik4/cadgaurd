import { useState, useEffect } from 'react';
import { ArrowLeft, Play, AlertCircle, CheckCircle, Loader, Download } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { ValidationResults } from './ValidationResults';
import { SimulationView } from './SimulationView';
import { CADViewer } from './CADViewer';

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

interface ProjectDetailsProps {
  project: Project;
  onBack: () => void;
  onUpdate: () => void;
}

export function ProjectDetails({ project, onBack, onUpdate }: ProjectDetailsProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'validation' | 'simulation' | '3d'>('overview');
  const [validating, setValidating] = useState(false);
  const [simulating, setSimulating] = useState(false);

  const handleRunValidation = async () => {
    setValidating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/validate-design`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId: project.id }),
        }
      );

      if (!response.ok) throw new Error('Validation failed');

      onUpdate();
    } catch (error) {
      console.error('Validation error:', error);
      alert('Failed to run validation. Please try again.');
    } finally {
      setValidating(false);
    }
  };

  const handleRunSimulation = async () => {
    setSimulating(true);
    try {
      const response = await fetch(
        `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/run-simulation`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${import.meta.env.VITE_SUPABASE_ANON_KEY}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ projectId: project.id }),
        }
      );

      if (!response.ok) throw new Error('Simulation failed');

      onUpdate();
      setActiveTab('simulation');
    } catch (error) {
      console.error('Simulation error:', error);
      alert('Failed to run simulation. Please try again.');
    } finally {
      setSimulating(false);
    }
  };

  const getQualityColor = (score: number) => {
    if (score >= 80) return 'text-green-600';
    if (score >= 60) return 'text-yellow-600';
    return 'text-red-600';
  };

  const tabs = [
    { id: 'overview' as const, label: 'Overview' },
    { id: 'validation' as const, label: 'Validation Results' },
    { id: 'simulation' as const, label: 'Stress Simulation' },
    { id: '3d' as const, label: '3D Viewer' },
  ];

  return (
    <div>
      <div className="mb-6">
        <button
          onClick={onBack}
          className="flex items-center space-x-2 text-slate-600 hover:text-slate-900 transition mb-4"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Back to Projects</span>
        </button>

        <div className="flex items-start justify-between">
          <div>
            <h2 className="text-2xl font-bold text-slate-900 mb-2">{project.name}</h2>
            {project.description && (
              <p className="text-slate-600 mb-4">{project.description}</p>
            )}
            <div className="flex items-center space-x-4 text-sm">
              <span className="text-slate-600">
                Format: <span className="font-medium text-slate-900">{project.file_format.toUpperCase()}</span>
              </span>
              <span className="text-slate-600">
                Uploaded: <span className="font-medium text-slate-900">
                  {new Date(project.created_at).toLocaleDateString()}
                </span>
              </span>
              <span className={`font-semibold ${getQualityColor(project.quality_score)}`}>
                Quality Score: {project.quality_score}%
              </span>
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <button
              onClick={handleRunValidation}
              disabled={validating}
              className="flex items-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
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
              className="flex items-center space-x-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg transition disabled:opacity-50"
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
          </div>
        </div>
      </div>

      <div className="border-b border-slate-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`pb-4 px-1 border-b-2 font-medium text-sm transition ${
                activeTab === tab.id
                  ? 'border-blue-600 text-blue-600'
                  : 'border-transparent text-slate-600 hover:text-slate-900'
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
              <div className="bg-blue-50 rounded-lg p-6">
                <CheckCircle className="w-8 h-8 text-blue-600 mb-3" />
                <h4 className="font-semibold text-slate-900 mb-1">Ready for Analysis</h4>
                <p className="text-sm text-slate-600">
                  Click "Run Validation" to analyze design quality
                </p>
              </div>

              <div className="bg-green-50 rounded-lg p-6">
                <AlertCircle className="w-8 h-8 text-green-600 mb-3" />
                <h4 className="font-semibold text-slate-900 mb-1">Stress Simulation</h4>
                <p className="text-sm text-slate-600">
                  Run digital twin simulation to predict failure points
                </p>
              </div>

              <div className="bg-purple-50 rounded-lg p-6">
                <Download className="w-8 h-8 text-purple-600 mb-3" />
                <h4 className="font-semibold text-slate-900 mb-1">Generate Report</h4>
                <p className="text-sm text-slate-600">
                  Export detailed validation and simulation reports
                </p>
              </div>
            </div>

            <div className="bg-slate-50 rounded-lg p-6">
              <h3 className="font-semibold text-slate-900 mb-3">Project Information</h3>
              <dl className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <dt className="text-slate-600 mb-1">File Name</dt>
                  <dd className="text-slate-900 font-medium">{project.name}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 mb-1">Format</dt>
                  <dd className="text-slate-900 font-medium">{project.file_format.toUpperCase()}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 mb-1">Status</dt>
                  <dd className="text-slate-900 font-medium capitalize">{project.status}</dd>
                </div>
                <div>
                  <dt className="text-slate-600 mb-1">Created</dt>
                  <dd className="text-slate-900 font-medium">
                    {new Date(project.created_at).toLocaleString()}
                  </dd>
                </div>
              </dl>
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
          <CADViewer fileUrl={project.file_url} fileFormat={project.file_format} />
        )}
      </div>
    </div>
  );
}
