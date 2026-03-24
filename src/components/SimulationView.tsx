import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { Activity, AlertTriangle, CheckCircle, TrendingUp, Zap } from 'lucide-react';

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
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
        <p className="text-slate-600">Loading simulation results...</p>
      </div>
    );
  }

  if (simulations.length === 0) {
    return (
      <div className="text-center py-12 bg-slate-50 rounded-lg">
        <Activity className="w-16 h-16 text-slate-300 mx-auto mb-4" />
        <h3 className="text-lg font-medium text-slate-900 mb-2">No simulation data yet</h3>
        <p className="text-slate-600">Click "Run Simulation" to perform stress analysis</p>
      </div>
    );
  }

  const latestSimulation = simulations[0];
  const failurePoints = (latestSimulation.failure_prediction as { points?: unknown[] })?.points || [];

  return (
    <div className="space-y-6">
      <div className={`border-2 rounded-xl p-6 ${
        latestSimulation.passed
          ? 'bg-green-50 border-green-300'
          : 'bg-red-50 border-red-300'
      }`}>
        <div className="flex items-center space-x-3 mb-4">
          {latestSimulation.passed ? (
            <>
              <CheckCircle className="w-8 h-8 text-green-600" />
              <div>
                <h3 className="text-xl font-bold text-green-900">Simulation Passed</h3>
                <p className="text-green-700">Design meets structural requirements</p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle className="w-8 h-8 text-red-600" />
              <div>
                <h3 className="text-xl font-bold text-red-900">Simulation Failed</h3>
                <p className="text-red-700">Design may fail under specified conditions</p>
              </div>
            </>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <Zap className="w-8 h-8 text-orange-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Maximum Stress</p>
          <p className="text-3xl font-bold text-slate-900">{latestSimulation.max_stress.toFixed(2)}</p>
          <p className="text-sm text-slate-600">MPa</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
          </div>
          <p className="text-sm text-slate-600 mb-1">Maximum Displacement</p>
          <p className="text-3xl font-bold text-slate-900">{latestSimulation.max_displacement.toFixed(3)}</p>
          <p className="text-sm text-slate-600">mm</p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-6">
          <div className="flex items-center justify-between mb-3">
            <CheckCircle className={`w-8 h-8 ${
              latestSimulation.safety_factor >= 2 ? 'text-green-600' : 'text-red-600'
            }`} />
          </div>
          <p className="text-sm text-slate-600 mb-1">Safety Factor</p>
          <p className={`text-3xl font-bold ${
            latestSimulation.safety_factor >= 2 ? 'text-green-600' : 'text-red-600'
          }`}>
            {latestSimulation.safety_factor.toFixed(2)}
          </p>
          <p className="text-sm text-slate-600">
            {latestSimulation.safety_factor >= 2 ? 'Acceptable' : 'Below recommended'}
          </p>
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Load Conditions</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(latestSimulation.load_conditions).map(([key, value]) => (
            <div key={key}>
              <p className="text-slate-600 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-slate-900 font-medium">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="bg-white border border-slate-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-4">Material Properties</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          {Object.entries(latestSimulation.material_properties).map(([key, value]) => (
            <div key={key}>
              <p className="text-slate-600 mb-1 capitalize">{key.replace(/_/g, ' ')}</p>
              <p className="text-slate-900 font-medium">{String(value)}</p>
            </div>
          ))}
        </div>
      </div>

      {Array.isArray(failurePoints) && failurePoints.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-red-900 mb-4">Predicted Failure Points</h3>
          <div className="space-y-3">
            {failurePoints.map((point: unknown, index: number) => {
              const pointData = point as {
                location?: { x?: number; y?: number; z?: number };
                stress?: number;
                mode?: string;
              };
              return (
                <div key={index} className="bg-white rounded-lg p-4 border border-red-300">
                  <div className="flex items-start space-x-3">
                    <AlertTriangle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
                    <div className="flex-1">
                      <h4 className="font-semibold text-red-900 mb-2">Failure Point #{index + 1}</h4>
                      <div className="grid grid-cols-2 gap-2 text-sm">
                        <div>
                          <p className="text-slate-600">Location</p>
                          <p className="text-slate-900 font-medium">
                            X: {pointData.location?.x?.toFixed(2) || 'N/A'},
                            Y: {pointData.location?.y?.toFixed(2) || 'N/A'},
                            Z: {pointData.location?.z?.toFixed(2) || 'N/A'}
                          </p>
                        </div>
                        <div>
                          <p className="text-slate-600">Stress at Point</p>
                          <p className="text-red-600 font-bold">{pointData.stress?.toFixed(2) || 'N/A'} MPa</p>
                        </div>
                        {pointData.mode && (
                          <div className="col-span-2">
                            <p className="text-slate-600">Failure Mode</p>
                            <p className="text-slate-900 font-medium">{pointData.mode}</p>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-blue-900 mb-3">Stress Distribution Visualization</h3>
        <div className="bg-white rounded-lg p-8 text-center border border-blue-300">
          <Activity className="w-16 h-16 text-blue-400 mx-auto mb-3" />
          <p className="text-slate-600">3D stress visualization would be rendered here</p>
          <p className="text-sm text-slate-500 mt-2">
            Heat map showing stress distribution across the model
          </p>
        </div>
      </div>

      <div className="bg-slate-50 rounded-lg p-6">
        <h3 className="text-lg font-semibold text-slate-900 mb-3">Simulation Details</h3>
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div>
            <p className="text-slate-600 mb-1">Simulation Type</p>
            <p className="text-slate-900 font-medium capitalize">
              {latestSimulation.simulation_type.replace(/_/g, ' ')}
            </p>
          </div>
          <div>
            <p className="text-slate-600 mb-1">Completed</p>
            <p className="text-slate-900 font-medium">
              {new Date(latestSimulation.created_at).toLocaleString()}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
