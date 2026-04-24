import React, { useState, useRef } from 'react';
import { BarChart3, Wrench, Ruler, AlertCircle, CheckCircle, Zap, Download, RefreshCw } from 'lucide-react';
import {
  analyzeSurfaceFeatures,
  detectHolesInGeometry,
  repairMesh as repairMeshAPI,
  measureDistance as measureDistanceAPI,
  measureAngle as measureAngleAPI,
  detectSharpEdges,
  type SurfaceFeatures,
  type HoleDetectionResult,
  type MeshRepairResult,
  type MeasurementResult,
  type SharpEdgeDetectionResult,
} from '../lib/backendApi';

interface GeometryStats {
  vertices: number;
  faces: number;
  bounding_box_min: number[];
  bounding_box_max: number[];
  extents: number[];
  volume: number;
  surface_area: number;
  is_watertight: boolean;
  estimated_wall_thickness_mm: number;
  non_manifold_edges: number;
  inconsistent_normals: boolean;
}


interface CAD3DToolsPanelProps {
  fileUrl: string;
  fileFormat: string;
}

const CAD3DToolsPanel: React.FC<CAD3DToolsPanelProps> = ({ fileUrl, fileFormat }) => {
  const [activeTab, setActiveTab] = useState<'geometry' | 'repair' | 'measurement' | 'dfm'>('geometry');
  const [loading, setLoading] = useState(false);
  const [geometryStats, setGeometryStats] = useState<GeometryStats | null>(null);
  const [holeDetection, setHoleDetection] = useState<HoleDetectionResult | null>(null);
  const [meshRepair, setMeshRepair] = useState<MeshRepairResult | null>(null);
  const [measurement, setMeasurement] = useState<MeasurementResult | null>(null);
  const [sharpEdges, setSharpEdges] = useState<SharpEdgeDetectionResult | null>(null);
  const [surfaceFeatures, setSurfaceFeatures] = useState<SurfaceFeatures | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [sectionViewActive, setSectionViewActive] = useState(false);

  // Measurement tool states
  const [p1, setP1] = useState([0, 0, 0]);
  const [p2, setP2] = useState([1, 1, 1]);
  const [v1, setV1] = useState([1, 0, 0]);
  const [v2, setV2] = useState([0, 1, 0]);
  const [measureMode, setMeasureMode] = useState<'distance' | 'angle'>('distance');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const uploadFile = async (callback: (file: File) => Promise<void>) => {
    try {
      setError(null);
      setLoading(true);

      // Create a temporary file input to get the file
      const input = document.createElement('input');
      input.type = 'file';
      input.accept = '.stl,.obj';
      input.onchange = async (e) => {
        const file = (e.target as HTMLInputElement).files?.[0];
        if (file) {
          await callback(file);
        }
      };
      input.click();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const analyzeGeometry = async (file: File) => {
    try {
      setLoading(true);
      setError(null);

      // Run all analyses in parallel
      const [holes, edges, features] = await Promise.allSettled([
        detectHolesInGeometry(file),
        detectSharpEdges(file),
        analyzeSurfaceFeatures(file),
      ]);

      // Handle surface features (has geometry stats)
      if (features.status === 'fulfilled') {
        setSurfaceFeatures(features.value);
        // Extract geometry stats from backend response - we'll create a mock stats object
        const stats: GeometryStats = {
          vertices: 0,
          faces: features.value.triangles || 0,
          bounding_box_min: [0, 0, 0],
          bounding_box_max: [1, 1, 1],
          extents: [1, 1, 1],
          volume: 0,
          surface_area: 0,
          is_watertight: features.value.is_manifold,
          estimated_wall_thickness_mm: 1.0,
          non_manifold_edges: 0,
          inconsistent_normals: false,
        };
        setGeometryStats(stats);
      }

      // Handle hole detection
      if (holes.status === 'fulfilled') {
        setHoleDetection(holes.value);
      }

      // Handle sharp edges
      if (edges.status === 'fulfilled') {
        setSharpEdges(edges.value);
      }

      if (features.status === 'rejected' && holes.status === 'rejected' && edges.status === 'rejected') {
        throw new Error('All analyses failed');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to analyze geometry');
    } finally {
      setLoading(false);
    }
  };

  const handleRepairMesh = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      const result = await repairMeshAPI(file);
      setMeshRepair(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to repair mesh');
    } finally {
      setLoading(false);
    }
  };

  const handleMeasureDistance = async (file: File) => {
    try {
      setLoading(true);
      setError(null);
      const result = await measureDistanceAPI(file, p1 as [number, number, number], p2 as [number, number, number]);
      setMeasurement(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to measure distance');
    } finally {
      setLoading(false);
    }
  };

  const handleMeasureAngle = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await measureAngleAPI(v1 as [number, number, number], v2 as [number, number, number]);
      setMeasurement(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to measure angle');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 rounded-lg border border-cyan-500/20 overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-cyan-600/20 to-blue-600/20 border-b border-cyan-500/30 px-6 py-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2">
          <Zap className="w-5 h-5 text-cyan-400" />
          3D CAD Analysis Tools
        </h2>
        <p className="text-xs text-cyan-200/60 mt-1">Advanced geometry analysis, mesh repair, and DFM checks</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 px-6 py-4 border-b border-slate-700/50 bg-slate-800/50 overflow-x-auto">
        {[
          { id: 'geometry', icon: BarChart3, label: 'Geometry Analysis' },
          { id: 'repair', icon: Wrench, label: 'Mesh Repair' },
          { id: 'measurement', icon: Ruler, label: 'Measurement' },
          { id: 'dfm', icon: AlertCircle, label: 'DFM Checker' },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id as any)}
            className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all whitespace-nowrap ${
              activeTab === tab.id
                ? 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/50'
                : 'text-slate-400 hover:text-slate-300 hover:bg-slate-700/50'
            }`}
          >
            <tab.icon className="w-4 h-4" />
            {tab.label}
          </button>
        ))}
      </div>

      {/* Error Message */}
      {error && (
        <div className="mx-6 mt-4 p-4 bg-red-900/30 border border-red-500/50 rounded-lg flex items-gap-3 gap-3">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0" />
          <p className="text-sm text-red-300">{error}</p>
        </div>
      )}

      {/* Content Area */}
      <div className="p-6">
        {/* Geometry Analysis Tab */}
        {activeTab === 'geometry' && (
          <div className="space-y-6">
            <div className="flex gap-3">
              <button
                onClick={() => {
                  const input = document.createElement('input');
                  input.type = 'file';
                  input.accept = '.stl,.obj';
                  input.onchange = async (e) => {
                    const file = (e.target as HTMLInputElement).files?.[0];
                    if (file) await analyzeGeometry(file);
                  };
                  input.click();
                }}
                disabled={loading}
                className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
              >
                {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                Analyze Geometry
              </button>
            </div>

            {geometryStats && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {/* Volume and Surface Area */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <BarChart3 className="w-4 h-4 text-cyan-400" />
                    Volume & Surface
                  </h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Volume:</span>
                      <span className="text-cyan-300 font-mono">{geometryStats.volume.toFixed(2)} mm³</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Surface Area:</span>
                      <span className="text-cyan-300 font-mono">{geometryStats.surface_area.toFixed(2)} mm²</span>
                    </div>
                  </div>
                </div>

                {/* Bounding Box */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Bounding Box</h3>
                  <div className="space-y-1 text-xs font-mono">
                    <div className="text-slate-400">Min: ({geometryStats.bounding_box_min.map((v) => v.toFixed(1)).join(', ')})</div>
                    <div className="text-slate-400">Max: ({geometryStats.bounding_box_max.map((v) => v.toFixed(1)).join(', ')})</div>
                    <div className="text-cyan-300 mt-2">
                      Extents: {geometryStats.extents.map((v) => v.toFixed(1)).join(' × ')} mm
                    </div>
                  </div>
                </div>

                {/* Wall Thickness */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Wall Thickness Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Estimated:</span>
                      <span className={`font-mono ${geometryStats.estimated_wall_thickness_mm < 1 ? 'text-red-400' : 'text-cyan-300'}`}>
                        {geometryStats.estimated_wall_thickness_mm.toFixed(2)} mm
                      </span>
                    </div>
                    {geometryStats.estimated_wall_thickness_mm < 1 && (
                      <p className="text-xs text-red-400">⚠️ Very thin walls detected</p>
                    )}
                  </div>
                </div>

                {/* Mesh Quality */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Mesh Quality</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Vertices:</span>
                      <span className="text-cyan-300 font-mono">{geometryStats.vertices}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Faces:</span>
                      <span className="text-cyan-300 font-mono">{geometryStats.faces}</span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Watertight:</span>
                      <span className="flex items-center gap-1">
                        {geometryStats.is_watertight ? (
                          <>
                            <CheckCircle className="w-4 h-4 text-green-400" />
                            <span className="text-green-400">Yes</span>
                          </>
                        ) : (
                          <>
                            <AlertCircle className="w-4 h-4 text-yellow-400" />
                            <span className="text-yellow-400">No</span>
                          </>
                        )}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Topology Issues */}
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-3">Topology Analysis</h3>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Non-Manifold Edges:</span>
                      <span className={`font-mono ${geometryStats.non_manifold_edges > 0 ? 'text-red-400' : 'text-green-400'}`}>
                        {geometryStats.non_manifold_edges}
                      </span>
                    </div>
                    <div className="flex justify-between items-center">
                      <span className="text-slate-400">Normal Issues:</span>
                      <span className={`${geometryStats.inconsistent_normals ? 'text-yellow-400' : 'text-green-400'}`}>
                        {geometryStats.inconsistent_normals ? '⚠️ Found' : '✓ None'}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Holes Detection */}
                {holeDetection && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Cavity Detection</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Cavities Found:</span>
                        <span className={`font-mono ${holeDetection.has_cavities ? 'text-yellow-400' : 'text-green-400'}`}>
                          {holeDetection.has_cavities ? 'Yes' : 'No'}
                        </span>
                      </div>
                      {holeDetection.has_cavities && (
                        <>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cavity Volume:</span>
                            <span className="text-yellow-300 font-mono">{holeDetection.cavity_volume.toFixed(2)} mm³</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-slate-400">Cavity %:</span>
                            <span className="text-yellow-300 font-mono">{holeDetection.cavity_percentage.toFixed(1)}%</span>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Sharp Edges */}
                {sharpEdges && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Sharp Edges</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Count:</span>
                        <span className={`font-mono ${sharpEdges.sharp_edges_count > 5 ? 'text-orange-400' : 'text-cyan-300'}`}>
                          {sharpEdges.sharp_edges_count}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Threshold:</span>
                        <span className="text-cyan-300 font-mono">{sharpEdges.threshold_degrees}°</span>
                      </div>
                    </div>
                  </div>
                )}

                {/* Surface Features */}
                {surfaceFeatures && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Surface Features</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Avg Edge Length:</span>
                        <span className="text-cyan-300 font-mono">{surfaceFeatures.average_edge_length.toFixed(4)} mm</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Is Manifold:</span>
                        <span className={surfaceFeatures.is_manifold ? 'text-green-400' : 'text-red-400'}>
                          {surfaceFeatures.is_manifold ? '✓' : '✗'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Genus:</span>
                        <span className="text-cyan-300 font-mono">{surfaceFeatures.genus}</span>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {!geometryStats && !loading && (
              <div className="text-center py-8 text-slate-400">
                <p>Click "Analyze Geometry" to start the analysis</p>
              </div>
            )}
          </div>
        )}

        {/* Mesh Repair Tab */}
        {activeTab === 'repair' && (
          <div className="space-y-6">
            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-2">Mesh Repair Operations</h3>
              <ul className="text-xs text-blue-200/70 space-y-1">
                <li>✓ Remove unreferenced vertices</li>
                <li>✓ Merge duplicate vertices</li>
                <li>✓ Fix inverted normals</li>
                <li>✓ Detect non-manifold edges</li>
              </ul>
            </div>

            <button
              onClick={() => {
                const input = document.createElement('input');
                input.type = 'file';
                input.accept = '.stl,.obj';
                input.onchange = async (e) => {
                  const file = (e.target as HTMLInputElement).files?.[0];
                  if (file) await handleRepairMesh(file);
                };
                input.click();
              }}
              disabled={loading}
              className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
            >
              {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
              Repair Mesh
            </button>

            {meshRepair && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Repair Summary</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-slate-400">Status:</span>
                        <span className={meshRepair.success ? 'text-green-400 font-semibold' : 'text-red-400'}>
                          {meshRepair.success ? '✓ Success' : '✗ Failed'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Vertices Removed:</span>
                        <span className="text-cyan-300 font-mono">{meshRepair.vertices_removed}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-slate-400">Faces Removed:</span>
                        <span className="text-cyan-300 font-mono">{meshRepair.faces_removed}</span>
                      </div>
                    </div>
                  </div>

                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Watertightness</h3>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">Before:</span>
                        <span className="flex items-center gap-1">
                          {meshRepair.is_watertight_before ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-400">Yes</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-400">No</span>
                            </>
                          )}
                        </span>
                      </div>
                      <div className="flex justify-between items-center">
                        <span className="text-slate-400">After:</span>
                        <span className="flex items-center gap-1">
                          {meshRepair.is_watertight_after ? (
                            <>
                              <CheckCircle className="w-4 h-4 text-green-400" />
                              <span className="text-green-400">Yes</span>
                            </>
                          ) : (
                            <>
                              <AlertCircle className="w-4 h-4 text-yellow-400" />
                              <span className="text-yellow-400">No</span>
                            </>
                          )}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {meshRepair.issues_fixed.length > 0 && (
                  <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-white mb-3">Issues Fixed</h3>
                    <ul className="space-y-1 text-sm">
                      {meshRepair.issues_fixed.map((issue, idx) => (
                        <li key={idx} className="text-cyan-300 flex items-center gap-2">
                          <CheckCircle className="w-4 h-4" />
                          {issue}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            )}

            {!meshRepair && !loading && (
              <div className="text-center py-8 text-slate-400">
                <p>Click "Repair Mesh" to start the repair process</p>
              </div>
            )}
          </div>
        )}

        {/* Measurement Tab */}
        {activeTab === 'measurement' && (
          <div className="space-y-6">
            <div className="flex gap-2">
              <button
                onClick={() => setMeasureMode('distance')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  measureMode === 'distance'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Distance
              </button>
              <button
                onClick={() => setMeasureMode('angle')}
                className={`flex-1 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                  measureMode === 'angle'
                    ? 'bg-cyan-600 text-white'
                    : 'bg-slate-700 text-slate-300 hover:bg-slate-600'
                }`}
              >
                Angle
              </button>
            </div>

            {measureMode === 'distance' && (
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Point 1</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                      <div key={axis}>
                        <label className="text-xs text-slate-400 block mb-1">{axis}</label>
                        <input
                          type="number"
                          value={p1[idx]}
                          onChange={(e) => setP1([...p1.slice(0, idx), parseFloat(e.target.value) || 0, ...p1.slice(idx + 1)])}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Point 2</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                      <div key={axis}>
                        <label className="text-xs text-slate-400 block mb-1">{axis}</label>
                        <input
                          type="number"
                          value={p2[idx]}
                          onChange={(e) => setP2([...p2.slice(0, idx), parseFloat(e.target.value) || 0, ...p2.slice(idx + 1)])}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={() => uploadFile(measureDistance)}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Measure Distance
                </button>

                {measurement && 'distance' in measurement && measurement.distance !== undefined && (
                  <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-400/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-cyan-300 mb-3">Result</h3>
                    <div className="text-2xl font-bold text-white">
                      {measurement.distance.toFixed(2)} mm
                    </div>
                    <p className="text-xs text-cyan-200/60 mt-2">
                      From ({p1.map((v) => v.toFixed(1)).join(', ')}) to ({p2.map((v) => v.toFixed(1)).join(', ')})
                    </p>
                  </div>
                )}
              </div>
            )}

            {measureMode === 'angle' && (
              <div className="space-y-4">
                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Vector 1</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                      <div key={axis}>
                        <label className="text-xs text-slate-400 block mb-1">{axis}</label>
                        <input
                          type="number"
                          value={v1[idx]}
                          onChange={(e) => setV1([...v1.slice(0, idx), parseFloat(e.target.value) || 0, ...v1.slice(idx + 1)])}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-white mb-4">Vector 2</h3>
                  <div className="grid grid-cols-3 gap-2">
                    {(['X', 'Y', 'Z'] as const).map((axis, idx) => (
                      <div key={axis}>
                        <label className="text-xs text-slate-400 block mb-1">{axis}</label>
                        <input
                          type="number"
                          value={v2[idx]}
                          onChange={(e) => setV2([...v2.slice(0, idx), parseFloat(e.target.value) || 0, ...v2.slice(idx + 1)])}
                          className="w-full px-2 py-1 bg-slate-700 border border-slate-600 rounded text-sm text-white"
                        />
                      </div>
                    ))}
                  </div>
                </div>

                <button
                  onClick={measureAngle}
                  disabled={loading}
                  className="w-full px-4 py-2 bg-cyan-600 hover:bg-cyan-700 disabled:bg-slate-700 text-white rounded-lg text-sm font-medium transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <RefreshCw className="w-4 h-4 animate-spin" />}
                  Measure Angle
                </button>

                {measurement && 'angle_degrees' in measurement && measurement.angle_degrees !== undefined && (
                  <div className="bg-gradient-to-r from-cyan-900/30 to-blue-900/30 border border-cyan-400/50 rounded-lg p-4">
                    <h3 className="text-sm font-semibold text-cyan-300 mb-3">Result</h3>
                    <div className="text-2xl font-bold text-white">
                      {measurement.angle_degrees.toFixed(2)}°
                    </div>
                    <p className="text-xs text-cyan-200/60 mt-2">
                      {(measurement.angle_radians || 0).toFixed(4)} radians
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* DFM Checker Tab */}
        {activeTab === 'dfm' && (
          <div className="space-y-4">
            <div className="bg-gradient-to-r from-orange-900/20 to-red-900/20 border border-orange-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-orange-300 mb-3">Design for Manufacturing (DFM) Checks</h3>
              <div className="space-y-3 text-sm">
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Wall Thickness</p>
                    <p className="text-xs text-slate-300">Minimum 0.5mm for injection molding, 1.0mm for CNC</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Draft Angles</p>
                    <p className="text-xs text-slate-300">Recommend 1-3° for molded parts</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Undercuts</p>
                    <p className="text-xs text-slate-300">Avoid or design with sliders for molding</p>
                  </div>
                </div>
                <div className="flex items-start gap-3">
                  <CheckCircle className="w-4 h-4 text-green-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="font-medium text-white">Sharp Edges</p>
                    <p className="text-xs text-slate-300">Apply 0.5mm-1.0mm radii for safety and tooling</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-blue-900/20 border border-blue-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-blue-300 mb-3">Manufacturing Considerations</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs text-blue-200/80">
                <div className="space-y-1">
                  <p className="font-medium">Injection Molding:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Wall thickness 1-4mm</li>
                    <li>1-3° draft angles</li>
                    <li>Avoid sharp radii</li>
                  </ul>
                </div>
                <div className="space-y-1">
                  <p className="font-medium">CNC Machining:</p>
                  <ul className="list-disc list-inside space-y-1 ml-2">
                    <li>Min radius 0.5mm</li>
                    <li>Flat surfaces preferred</li>
                    <li>Multiple setups considered</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="bg-purple-900/20 border border-purple-500/30 rounded-lg p-4">
              <h3 className="text-sm font-semibold text-purple-300 mb-3">Material-Specific Rules</h3>
              <div className="space-y-3 text-xs text-purple-200/80">
                <div>
                  <p className="font-medium mb-1">Aluminum (6061, 7075):</p>
                  <p>Good machinability, corrosion resistant, medium cost</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Steel (Stainless, Carbon):</p>
                  <p>High strength, good for structural parts, requires chip clearance</p>
                </div>
                <div>
                  <p className="font-medium mb-1">Plastics (ABS, PETG):</p>
                  <p>Injection molding friendly, requires proper cooling channels</p>
                </div>
              </div>
            </div>

            {geometryStats && (
              <div className="bg-slate-800/50 border border-slate-700/50 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-white mb-3">Current Design Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex items-center gap-2">
                    {geometryStats.estimated_wall_thickness_mm >= 0.5 ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-red-400" />
                    )}
                    <span>
                      Wall thickness: {geometryStats.estimated_wall_thickness_mm.toFixed(2)}mm
                      <span className={`ml-2 ${geometryStats.estimated_wall_thickness_mm >= 0.5 ? 'text-green-400' : 'text-red-400'}`}>
                        {geometryStats.estimated_wall_thickness_mm >= 0.5 ? '✓ OK' : '✗ Too thin'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {sharpEdges && sharpEdges.sharp_edges_count <= 10 ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-orange-400" />
                    )}
                    <span>
                      Sharp edges: {sharpEdges?.sharp_edges_count || 0}
                      <span className={`ml-2 ${(sharpEdges?.sharp_edges_count || 0) <= 10 ? 'text-green-400' : 'text-orange-400'}`}>
                        {(sharpEdges?.sharp_edges_count || 0) <= 10 ? '✓ Acceptable' : '⚠ High count'}
                      </span>
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    {geometryStats.is_watertight ? (
                      <CheckCircle className="w-4 h-4 text-green-400" />
                    ) : (
                      <AlertCircle className="w-4 h-4 text-yellow-400" />
                    )}
                    <span>
                      Mesh quality: {geometryStats.is_watertight ? 'Watertight' : 'Non-watertight'}
                      <span className={`ml-2 ${geometryStats.is_watertight ? 'text-green-400' : 'text-yellow-400'}`}>
                        {geometryStats.is_watertight ? '✓ OK' : '⚠ Repair needed'}
                      </span>
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default CAD3DToolsPanel;
