import { useMemo, useState } from 'react';
import {
  runBackendSimulationForFile,
  runBackendValidationForFile,
  type BackendSimulateResponse,
  type BackendValidateResponse,
} from '../lib/backendApi';

interface ModelResult {
  fileName: string;
  validation: BackendValidateResponse;
  simulation: BackendSimulateResponse;
}

export function ComparePage() {
  const [fileA, setFileA] = useState<File | null>(null);
  const [fileB, setFileB] = useState<File | null>(null);
  const [resultA, setResultA] = useState<ModelResult | null>(null);
  const [resultB, setResultB] = useState<ModelResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const delta = useMemo(() => {
    if (!resultA || !resultB) return null;

    return {
      quality: resultA.validation.summary.quality_score - resultB.validation.summary.quality_score,
      stress: resultA.simulation.simulation.max_stress - resultB.simulation.simulation.max_stress,
      issues: resultA.validation.summary.total_issues - resultB.validation.summary.total_issues,
    };
  }, [resultA, resultB]);

  const compare = async () => {
    if (!fileA || !fileB) {
      setError('Upload two CAD models to compare.');
      return;
    }

    setError('');
    setLoading(true);
    try {
      const [validationA, validationB] = await Promise.all([
        runBackendValidationForFile(fileA),
        runBackendValidationForFile(fileB),
      ]);

      const [simulationA, simulationB] = await Promise.all([
        runBackendSimulationForFile(fileA, 'aluminum_6061'),
        runBackendSimulationForFile(fileB, 'aluminum_6061'),
      ]);

      setResultA({
        fileName: fileA.name,
        validation: validationA,
        simulation: simulationA,
      });
      setResultB({
        fileName: fileB.name,
        validation: validationB,
        simulation: simulationB,
      });
    } catch (err) {
      setError((err as Error).message || 'Failed to compare models.');
    } finally {
      setLoading(false);
    }
  };

  const diffClass = (value: number, invert = false) => {
    const positive = invert ? value < 0 : value > 0;
    if (value === 0) return 'text-slate-200';
    return positive ? 'text-emerald-300' : 'text-rose-300';
  };

  return (
    <div className="space-y-6">
      <div className="glass-card rounded-xl border border-slate-700/70 p-6">
        <h2 className="text-2xl font-semibold text-white mb-2">Model Comparison</h2>
        <p className="text-sm text-slate-300 mb-4">
          Upload two models to compare quality score, stress performance, and validation issues side-by-side.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <label className="rounded-lg border border-cyan-400/30 bg-cyan-500/10 p-4">
            <p className="text-sm text-cyan-100 mb-2">Model A</p>
            <input type="file" accept=".stl,.obj,.step,.stp" onChange={(e) => setFileA(e.target.files?.[0] || null)} />
            {fileA && <p className="text-xs text-slate-200 mt-2">{fileA.name}</p>}
          </label>

          <label className="rounded-lg border border-fuchsia-400/30 bg-fuchsia-500/10 p-4">
            <p className="text-sm text-fuchsia-100 mb-2">Model B</p>
            <input type="file" accept=".stl,.obj,.step,.stp" onChange={(e) => setFileB(e.target.files?.[0] || null)} />
            {fileB && <p className="text-xs text-slate-200 mt-2">{fileB.name}</p>}
          </label>

          <button
            onClick={compare}
            disabled={loading}
            className="rounded-lg border border-violet-400/40 bg-violet-500/15 text-violet-100 hover:bg-violet-500/25 transition px-4 py-3 disabled:opacity-50"
          >
            {loading ? 'Comparing...' : 'Run Comparison'}
          </button>
        </div>

        {error && <p className="text-sm text-rose-200 mt-3">{error}</p>}
      </div>

      {resultA && resultB && delta && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl border border-cyan-400/30 p-5">
            <p className="text-xs text-cyan-200 mb-1">Quality Score Difference (A - B)</p>
            <p className={`text-3xl font-bold ${diffClass(delta.quality)}`}>{delta.quality.toFixed(1)}</p>
            <p className="text-xs text-slate-400 mt-1">Higher is better</p>
          </div>
          <div className="glass-card rounded-xl border border-rose-400/30 p-5">
            <p className="text-xs text-rose-200 mb-1">Max Stress Difference (A - B)</p>
            <p className={`text-3xl font-bold ${diffClass(delta.stress, true)}`}>{delta.stress.toFixed(2)} MPa</p>
            <p className="text-xs text-slate-400 mt-1">Lower is better</p>
          </div>
          <div className="glass-card rounded-xl border border-amber-400/30 p-5">
            <p className="text-xs text-amber-200 mb-1">Issue Count Difference (A - B)</p>
            <p className={`text-3xl font-bold ${diffClass(delta.issues, true)}`}>{delta.issues}</p>
            <p className="text-xs text-slate-400 mt-1">Lower is better</p>
          </div>

          {[resultA, resultB].map((result) => (
            <div key={result.fileName} className="glass-card rounded-xl border border-slate-700/70 p-5 lg:col-span-1">
              <h3 className="text-lg font-semibold text-white mb-2">{result.fileName}</h3>
              <ul className="space-y-2 text-sm text-slate-200">
                <li>Quality Score: {result.validation.summary.quality_score}%</li>
                <li>Total Issues: {result.validation.summary.total_issues}</li>
                <li>High Issues: {result.validation.summary.high_issues}</li>
                <li>Max Stress: {result.simulation.simulation.max_stress.toFixed(2)} MPa</li>
                <li>Risk Level: {result.simulation.simulation.risk_level.toUpperCase()}</li>
              </ul>
            </div>
          ))}

          <div className="glass-card rounded-xl border border-slate-700/70 p-5 lg:col-span-1">
            <h3 className="text-lg font-semibold text-white mb-2">Highlighted Differences</h3>
            <ul className="space-y-2 text-sm text-slate-200">
              <li className={diffClass(delta.quality)}>Quality: {delta.quality > 0 ? 'Model A leads' : delta.quality < 0 ? 'Model B leads' : 'Tie'}</li>
              <li className={diffClass(delta.stress, true)}>Stress: {delta.stress < 0 ? 'Model A safer' : delta.stress > 0 ? 'Model B safer' : 'Tie'}</li>
              <li className={diffClass(delta.issues, true)}>Issues: {delta.issues < 0 ? 'Model A cleaner' : delta.issues > 0 ? 'Model B cleaner' : 'Tie'}</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
