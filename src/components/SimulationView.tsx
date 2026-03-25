import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Zap } from 'lucide-react';
import { StressHeatmap3D } from './StressHeatmap3D';

interface SimulationResult {
  id: string;
  simulation_type: string;
  load_conditions: Record<string, unknown>;
  material_properties: Record<string, unknown>;
  max_stress: number;
  max_displacement: number;
  safety_factor: number;
  failure_prediction: Record<string, unknown>;
  visualization_data: Record<string, unknown>;
  passed: boolean;
  created_at: string;
}

interface SimulationViewProps {
  projectId: string;
}

export function SimulationView({ projectId }: SimulationViewProps) {
  const [simulations, setSimulations] = useState<SimulationResult[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadSimulationData();
  }, [projectId]);

  const loadSimulationData = async () => {
    try {
      const { data } = await supabase
        .from('simulation_results')
        .select('*')
        .eq('project_id', projectId)
        .order('created_at', { ascending: false });

      setSimulations(data || []);
    } catch (error) {
      console.error('Error loading simulation data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
        <p className="text-cyan-100/80">Loading simulation results...</p>
      </div>
    );
  }

  if (simulations.length === 0) {
    return (
      <div className="text-center py-12 glass-card rounded-lg border border-cyan-400/25">
        <Activity className="w-16 h-16 text-cyan-300/70 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-100 mb-2">No simulation data yet</h3>
        <p className="text-cyan-100/80">Click "Run Simulation" to perform stress analysis</p>
      </div>
    );
  }

  const latestSimulation = simulations[0];
  const weakRegions =
    (latestSimulation.failure_prediction as { weak_regions?: Array<{ face_index: number; risk_score: number }> })
      ?.weak_regions || [];
  const riskLevel =
    (latestSimulation.failure_prediction as { risk_level?: string })?.risk_level ||
    (latestSimulation.passed ? 'low' : 'high');
  const riskPercentage = Math.min(100, Math.max(5, Math.round((latestSimulation.max_stress / 250) * 100)));
  const stressMap =
    (latestSimulation.visualization_data as { stress_map?: Array<{ x: number; y: number; z: number; stress: number }> })?.stress_map || [];

  return (
    <div className="space-y-6">
      <div className={`border-2 rounded-xl p-6 ${
        latestSimulation.passed
          ? 'bg-emerald-500/12 border-emerald-400/30'
          : 'bg-rose-500/12 border-rose-400/30'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          {latestSimulation.passed ? (
            <>
              <CheckCircle className="w-8 h-8 text-emerald-300" />
              <div>
                <h3 className="text-xl font-bold text-emerald-100">Simulation Passed</h3>
                <p className="text-emerald-200">Design meets structural requirements</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-8 h-8 text-rose-300" />
              <div>
                <h3 className="text-xl font-bold text-rose-100">Simulation Failed</h3>
                <p className="text-rose-200">Design may fail under specified conditions</p>
              </div>
            </>
          )}
        </div>
        <div className="rounded-lg border border-slate-600/40 bg-slate-900/45 p-3">
          <div className="flex items-center justify-between text-xs text-slate-300 mb-2">
            <span>Failure Risk ({riskLevel.toUpperCase()})</span>
            <span>{riskPercentage}%</span>
          </div>
          <div className="h-2 bg-slate-950 rounded overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-cyan-400 via-amber-400 to-rose-400"
              style={{ width: `${riskPercentage}%` }}
            />
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="glass-card border border-orange-400/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 text-orange-300" />
          </div>
          <p className="text-sm text-slate-300 mb-1">Maximum Stress</p>
          <p className="text-3xl font-bold text-slate-100">{latestSimulation.max_stress.toFixed(2)}</p>
          <p className="text-sm text-slate-400">MPa</p>
        </div>

        <div className="glass-card border border-cyan-400/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-cyan-300" />
          </div>
          <p className="text-sm text-slate-300 mb-1">Maximum Displacement</p>
          <p className="text-3xl font-bold text-slate-100">{latestSimulation.max_displacement.toFixed(3)}</p>
          <p className="text-sm text-slate-400">mm</p>
        </div>

        <div className="glass-card border border-emerald-400/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className={`w-8 h-8 ${
              latestSimulation.safety_factor >= 2 ? 'text-emerald-300' : 'text-rose-300'
            }`} />
          </div>
          <p className="text-sm text-slate-300 mb-1">Safety Factor</p>
          <p className={`text-3xl font-bold ${
            latestSimulation.safety_factor >= 2 ? 'text-emerald-300' : 'text-rose-300'
          }`}>
            {latestSimulation.safety_factor.toFixed(2)}
          </p>
          <p className="text-sm text-slate-400">
            {latestSimulation.safety_factor >= 2 ? 'Acceptable' : 'Below recommended'}
          </p>
        </div>

        <div className="glass-card border border-violet-400/30 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <Activity className="w-8 h-8 text-violet-300" />
          </div>
          <p className="text-sm text-slate-300 mb-1">Weak Regions</p>
          <p className="text-3xl font-bold text-slate-100">{weakRegions.length}</p>
          <p className="text-sm text-slate-400">faces flagged</p>
        </div>
      </div>

      <div className="glass-card border border-slate-600/35 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Load Conditions</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(latestSimulation.load_conditions).map(([key, value]) => (
            <div key={key}>
              <p className="text-slate-400 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-slate-100 font-medium">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="glass-card border border-slate-600/35 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-100 mb-4">Material Properties</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(latestSimulation.material_properties).map(([key, value]) => (
            <div key={key}>
              <p className="text-slate-400 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-slate-100 font-medium">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {Array.isArray(weakRegions) && weakRegions.length > 0 && (
        <div className="bg-rose-500/12 border border-rose-400/30 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-rose-100 mb-4">Predicted Weak Regions</h3>
          <div className="space-y-3">
            {weakRegions.map((region, index: number) => {
              return (
                <div key={index} className="bg-slate-950/60 rounded-lg p-4 border border-rose-400/30">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-rose-300 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-rose-100 mb-2">Weak Region #{index + 1}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-400">Face Index</p>
                          <p className="text-slate-100 font-medium">{region.face_index}</p>
                        </div>
                        <div>
                          <p className="text-slate-400">Risk Score</p>
                          <p className="text-rose-300 font-bold">{region.risk_score.toFixed(2)} MPa</p>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-cyan-500/10 border border-cyan-400/30 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-cyan-100 mb-3">Stress Distribution Heatmap</h3>
        <StressHeatmap3D points={stressMap} />
        <p className="text-sm text-slate-300 mt-3">
          Heatmap points: {stressMap.length}. Gradient uses blue for low stress and red for high stress.
        </p>
      </div>

      <div className="glass-card rounded-lg p-6 border border-slate-600/35">
        <h3 className="text-lg font-semibold text-slate-100 mb-3">Simulation Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-400 mb-1">Simulation Type</p>
            <p className="text-slate-100 font-medium capitalize">
              {latestSimulation.simulation_type.replace(/_/g, ' ')}
            </p>
          </div>
          <div>
            <p className="text-slate-400 mb-1">Completed</p>
            <p className="text-slate-100 font-medium">
              {new Date(latestSimulation.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
