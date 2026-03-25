import { useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { GitCompare, Gauge, Layers3, Sigma } from 'lucide-react';

interface Project {
  id: string;
  name: string;
  quality_score: number;
}

interface LatestSimulation {
  max_stress: number;
  avg_stress: number;
}

interface ComparisonSnapshot {
  projectId: string;
  quality: number;
  geometryFaces: number;
  geometryVolume: number;
  simulation: LatestSimulation | null;
}

interface VersionComparisonProps {
  projects: Project[];
}

export function VersionComparison({ projects }: VersionComparisonProps) {
  const [leftProjectId, setLeftProjectId] = useState<string>('');
  const [rightProjectId, setRightProjectId] = useState<string>('');
  const [leftSnapshot, setLeftSnapshot] = useState<ComparisonSnapshot | null>(null);
  const [rightSnapshot, setRightSnapshot] = useState<ComparisonSnapshot | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const selectableProjects = useMemo(() => projects.slice(0, 40), [projects]);

  const loadProjectSnapshot = async (projectId: string): Promise<ComparisonSnapshot> => {
    const { data: projectData, error: projectError } = await supabase
      .from('projects')
      .select('id, quality_score, metadata')
      .eq('id', projectId)
      .single();

    if (projectError || !projectData) {
      throw new Error(projectError?.message || 'Failed to load selected project');
    }

    const geometry = (projectData.metadata as { geometry?: { faces?: number; volume?: number } })?.geometry;

    const { data: simulationData } = await supabase
      .from('simulation_results')
      .select('max_stress, avg_stress')
      .eq('project_id', projectId)
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle();

    return {
      projectId,
      quality: Number(projectData.quality_score || 0),
      geometryFaces: Number(geometry?.faces || 0),
      geometryVolume: Number(geometry?.volume || 0),
      simulation: simulationData
        ? {
            max_stress: Number(simulationData.max_stress || 0),
            avg_stress: Number(simulationData.avg_stress || 0),
          }
        : null,
    };
  };

  const runComparison = async () => {
    if (!leftProjectId || !rightProjectId) {
      setError('Select two project versions to compare.');
      return;
    }
    if (leftProjectId === rightProjectId) {
      setError('Choose two different project versions.');
      return;
    }

    setLoading(true);
    setError('');
    try {
      const [left, right] = await Promise.all([
        loadProjectSnapshot(leftProjectId),
        loadProjectSnapshot(rightProjectId),
      ]);
      setLeftSnapshot(left);
      setRightSnapshot(right);
    } catch (compareError) {
      setError((compareError as Error).message || 'Comparison failed');
    } finally {
      setLoading(false);
    }
  };

  const selectedLeftName = selectableProjects.find((p) => p.id === leftProjectId)?.name || 'Version A';
  const selectedRightName = selectableProjects.find((p) => p.id === rightProjectId)?.name || 'Version B';

  const qualityDelta = leftSnapshot && rightSnapshot ? rightSnapshot.quality - leftSnapshot.quality : 0;
  const stressDelta = leftSnapshot && rightSnapshot
    ? (rightSnapshot.simulation?.max_stress || 0) - (leftSnapshot.simulation?.max_stress || 0)
    : 0;

  return (
    <div className="glass-card border border-violet-400/25 rounded-xl p-5">
      <div className="flex items-center gap-2 mb-4">
        <GitCompare className="w-5 h-5 text-violet-300" />
        <h3 className="text-lg font-semibold text-white">Version Comparison</h3>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-4">
        <select
          value={leftProjectId}
          onChange={(e) => setLeftProjectId(e.target.value)}
          className="px-3 py-2 border border-cyan-400/35 bg-slate-900/75 text-slate-100 rounded-lg text-sm"
        >
          <option value="">Select Version A</option>
          {selectableProjects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>

        <select
          value={rightProjectId}
          onChange={(e) => setRightProjectId(e.target.value)}
          className="px-3 py-2 border border-fuchsia-400/35 bg-slate-900/75 text-slate-100 rounded-lg text-sm"
        >
          <option value="">Select Version B</option>
          {selectableProjects.map((project) => (
            <option key={project.id} value={project.id}>{project.name}</option>
          ))}
        </select>

        <button
          onClick={runComparison}
          disabled={loading}
          className="px-4 py-2 rounded-lg border border-violet-400/45 text-violet-200 bg-violet-500/15 hover:bg-violet-500/25 transition disabled:opacity-50"
        >
          {loading ? 'Comparing...' : 'Run Comparison'}
        </button>
      </div>

      {error && <p className="text-sm text-rose-300 mb-4">{error}</p>}

      {leftSnapshot && rightSnapshot && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="bg-slate-900/55 border border-cyan-400/25 rounded-lg p-4">
            <p className="text-cyan-200 font-medium mb-3">{selectedLeftName}</p>
            <div className="space-y-2 text-sm text-slate-200">
              <p className="flex items-center gap-2"><Gauge className="w-4 h-4 text-cyan-300" /> Quality: {leftSnapshot.quality}%</p>
              <p className="flex items-center gap-2"><Layers3 className="w-4 h-4 text-cyan-300" /> Faces: {leftSnapshot.geometryFaces.toLocaleString()}</p>
              <p className="flex items-center gap-2"><Sigma className="w-4 h-4 text-cyan-300" /> Max Stress: {leftSnapshot.simulation?.max_stress?.toFixed(2) || 'N/A'} MPa</p>
              <p className="text-slate-400">Volume: {leftSnapshot.geometryVolume.toFixed(2)}</p>
            </div>
          </div>

          <div className="bg-slate-900/55 border border-fuchsia-400/25 rounded-lg p-4">
            <p className="text-fuchsia-200 font-medium mb-3">{selectedRightName}</p>
            <div className="space-y-2 text-sm text-slate-200">
              <p className="flex items-center gap-2"><Gauge className="w-4 h-4 text-fuchsia-300" /> Quality: {rightSnapshot.quality}%</p>
              <p className="flex items-center gap-2"><Layers3 className="w-4 h-4 text-fuchsia-300" /> Faces: {rightSnapshot.geometryFaces.toLocaleString()}</p>
              <p className="flex items-center gap-2"><Sigma className="w-4 h-4 text-fuchsia-300" /> Max Stress: {rightSnapshot.simulation?.max_stress?.toFixed(2) || 'N/A'} MPa</p>
              <p className="text-slate-400">Volume: {rightSnapshot.geometryVolume.toFixed(2)}</p>
            </div>
          </div>

          <div className="md:col-span-2 rounded-lg border border-violet-400/30 bg-violet-500/10 p-4 text-sm text-violet-100">
            <p>Quality Delta (B - A): <span className={qualityDelta >= 0 ? 'text-emerald-300' : 'text-rose-300'}>{qualityDelta.toFixed(1)}%</span></p>
            <p>Max Stress Delta (B - A): <span className={stressDelta <= 0 ? 'text-emerald-300' : 'text-rose-300'}>{stressDelta.toFixed(2)} MPa</span></p>
          </div>
        </div>
      )}
    </div>
  );
}
