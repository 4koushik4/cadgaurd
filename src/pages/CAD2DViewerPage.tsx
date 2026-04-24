import { useState, useRef, useEffect, useMemo } from 'react';
import { Upload, ZoomIn, ZoomOut, Eye, Grid3X3 } from 'lucide-react';
import { motion } from 'framer-motion';
import { load2DFile, analyze2DGeometry, validate2DGeometry, CAD2DFileResponse, Geometry2DAnalysis, Geometry2DValidation } from '../lib/backendApi';

type CAD2DEntity = {
  type: string;
  start?: [number, number];
  end?: [number, number];
  center?: [number, number];
  radius?: number;
  start_angle?: number;
  end_angle?: number;
  vertices?: Array<[number, number]>;
  corner1?: [number, number];
  corner2?: [number, number];
  position?: [number, number];
  content?: string;
  is_closed?: boolean;
};

export function CAD2DViewerPage() {
  const [file, setFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [fileData, setFileData] = useState<CAD2DFileResponse | null>(null);
  const [analysis, setAnalysis] = useState<Geometry2DAnalysis | null>(null);
  const [validation, setValidation] = useState<Geometry2DValidation | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<SVGSVGElement>(null);
  const canvasContainerRef = useRef<HTMLDivElement>(null);
  const [selectedTab, setSelectedTab] = useState<'viewer' | 'analysis' | 'validation'>('viewer');

  const flattenedEntities = useMemo(() => {
    if (!fileData?.layers) return [] as CAD2DEntity[];

    const entities: CAD2DEntity[] = [];
    const layers = fileData.layers as Record<string, unknown>;
    Object.values(layers).forEach((value) => {
      if (Array.isArray(value)) {
        value.forEach((entity) => {
          if (entity && typeof entity === 'object' && 'type' in entity) {
            entities.push(entity as CAD2DEntity);
          }
        });
      }
    });

    return entities;
  }, [fileData]);

  useEffect(() => {
    const container = canvasContainerRef.current;
    if (!container) return;

    const handleWheel = (event: WheelEvent) => {
      event.preventDefault();
      const direction = event.deltaY < 0 ? 1 : -1;
      setZoom((prev) => Math.max(0.1, Math.min(5, prev + direction * 0.1)));
    };

    container.addEventListener('wheel', handleWheel, { passive: false });

    return () => {
      container.removeEventListener('wheel', handleWheel);
    };
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFile = e.target.files?.[0];
    if (!uploadedFile) return;

    if (!uploadedFile.name.endsWith('.dxf') && !uploadedFile.name.endsWith('.svg')) {
      setError('Only DXF and SVG files are supported');
      return;
    }

    setFile(uploadedFile);
    setError('');
    await processFile(uploadedFile);
  };

  const processFile = async (fileToProcess: File) => {
    setLoading(true);
    try {
      const data = await load2DFile(fileToProcess);
      setFileData(data);

      const analysisData = await analyze2DGeometry(fileToProcess);
      setAnalysis(analysisData);

      const validationData = await validate2DGeometry(fileToProcess);
      setValidation(validationData);

      setZoom(1);
      setPan({ x: 0, y: 0 });
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to process file');
    } finally {
      setLoading(false);
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(true);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (isDragging) {
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const handleZoomFit = () => {
    if (!fileData) return;
    const bbox = fileData.bounding_box;
    const width = bbox.width || 400;
    const height = bbox.height || 300;
    const containerAspect = canvasRef.current?.clientWidth ? canvasRef.current.clientWidth / 500 : 1;
    const contentAspect = width / height;

    let newZoom = 1;
    if (containerAspect > contentAspect) {
      newZoom = 500 / height;
    } else {
      newZoom = (canvasRef.current?.clientWidth || 400) / width;
    }

    setZoom(Math.min(newZoom * 0.9, 3));
    setPan({ x: 50, y: 50 });
  };

  const mapPointToViewport = (point: [number, number]): [number, number] => {
    const bbox = fileData?.bounding_box;
    if (!bbox) return point;

    const padding = 20;
    const viewportWidth = 400;
    const viewportHeight = 300;
    const width = bbox.width > 0 ? bbox.width : 1;
    const height = bbox.height > 0 ? bbox.height : 1;

    const x = padding + ((point[0] - bbox.min_x) / width) * (viewportWidth - padding * 2);
    const y = viewportHeight - (padding + ((point[1] - bbox.min_y) / height) * (viewportHeight - padding * 2));

    return [x, y];
  };

  const renderEntity = (entity: CAD2DEntity, index: number) => {
    const stroke = '#38bdf8';
    const fill = 'rgba(56, 189, 248, 0.18)';

    if (entity.type === 'line' && entity.start && entity.end) {
      const [x1, y1] = mapPointToViewport(entity.start);
      const [x2, y2] = mapPointToViewport(entity.end);
      return <line key={`line-${index}`} x1={x1} y1={y1} x2={x2} y2={y2} stroke={stroke} strokeWidth="1.5" />;
    }

    if (entity.type === 'circle' && entity.center && typeof entity.radius === 'number') {
      const [cx, cy] = mapPointToViewport(entity.center);
      const bbox = fileData?.bounding_box;
      const scaleX = bbox && bbox.width > 0 ? (400 - 40) / bbox.width : 1;
      const scaleY = bbox && bbox.height > 0 ? (300 - 40) / bbox.height : 1;
      const r = entity.radius * Math.min(scaleX, scaleY);

      return (
        <circle
          key={`circle-${index}`}
          cx={cx}
          cy={cy}
          r={Math.max(1, r)}
          stroke={stroke}
          fill={fill}
          strokeWidth="1.5"
        />
      );
    }

    if (entity.type === 'arc' && entity.center && typeof entity.radius === 'number') {
      const startDeg = entity.start_angle ?? 0;
      const endDeg = entity.end_angle ?? 0;
      const startRad = (startDeg * Math.PI) / 180;
      const endRad = (endDeg * Math.PI) / 180;
      const startPoint: [number, number] = [
        entity.center[0] + entity.radius * Math.cos(startRad),
        entity.center[1] + entity.radius * Math.sin(startRad),
      ];
      const endPoint: [number, number] = [
        entity.center[0] + entity.radius * Math.cos(endRad),
        entity.center[1] + entity.radius * Math.sin(endRad),
      ];

      const [x1, y1] = mapPointToViewport(startPoint);
      const [x2, y2] = mapPointToViewport(endPoint);
      const bbox = fileData?.bounding_box;
      const scaleX = bbox && bbox.width > 0 ? (400 - 40) / bbox.width : 1;
      const scaleY = bbox && bbox.height > 0 ? (300 - 40) / bbox.height : 1;
      const r = Math.max(1, entity.radius * Math.min(scaleX, scaleY));
      const delta = ((endDeg - startDeg) % 360 + 360) % 360;
      const largeArcFlag = delta > 180 ? 1 : 0;

      return (
        <path
          key={`arc-${index}`}
          d={`M ${x1} ${y1} A ${r} ${r} 0 ${largeArcFlag} 1 ${x2} ${y2}`}
          stroke={stroke}
          fill="none"
          strokeWidth="1.5"
        />
      );
    }

    if ((entity.type === 'polyline' || entity.type === 'lwpolyline') && entity.vertices && entity.vertices.length > 1) {
      const points = entity.vertices.map((p) => mapPointToViewport(p)).map(([x, y]) => `${x},${y}`).join(' ');

      if (entity.is_closed) {
        return <polygon key={`poly-${index}`} points={points} stroke={stroke} fill={fill} strokeWidth="1.5" />;
      }

      return <polyline key={`polyline-${index}`} points={points} stroke={stroke} fill="none" strokeWidth="1.5" />;
    }

    if (entity.type === 'rectangle' && entity.corner1 && entity.corner2) {
      const [x1, y1] = mapPointToViewport(entity.corner1);
      const [x2, y2] = mapPointToViewport(entity.corner2);
      return (
        <rect
          key={`rect-${index}`}
          x={Math.min(x1, x2)}
          y={Math.min(y1, y2)}
          width={Math.abs(x2 - x1)}
          height={Math.abs(y2 - y1)}
          stroke={stroke}
          fill={fill}
          strokeWidth="1.5"
        />
      );
    }

    if (entity.type === 'text' && entity.position) {
      const [x, y] = mapPointToViewport(entity.position);
      return (
        <text key={`text-${index}`} x={x} y={y} fill="#e2e8f0" fontSize="10">
          {entity.content || 'TEXT'}
        </text>
      );
    }

    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Grid3X3 className="w-8 h-8 text-violet-400" />
          2D CAD Viewer
        </h1>
        <p className="text-slate-300">View and analyze DXF and SVG files</p>
      </div>

      {/* Upload Area or Viewer */}
      {!file ? (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-card border border-violet-400/30 rounded-xl p-12"
        >
          <div className="flex flex-col items-center justify-center">
            <Upload className="w-16 h-16 text-violet-400 opacity-50 mb-4" />
            <h2 className="text-xl font-semibold text-white mb-2">Upload 2D CAD File</h2>
            <p className="text-slate-400 mb-6">Drag and drop your DXF or SVG file here</p>

            <label className="cursor-pointer">
              <input
                type="file"
                accept=".dxf,.svg"
                onChange={handleFileUpload}
                className="hidden"
              />
              <div className="px-6 py-3 bg-gradient-to-r from-violet-500/80 via-fuchsia-500/70 to-cyan-500/80 text-white font-semibold rounded-lg hover:shadow-lg hover:shadow-violet-500/50 transition">
                Choose File
              </div>
            </label>

            <p className="text-xs text-slate-500 mt-4">Supported formats: DXF, SVG</p>
          </div>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
          {/* Main Viewer */}
          <div className="lg:col-span-3 space-y-4">
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-card border border-violet-400/20 rounded-xl p-4"
            >
              {/* Controls */}
              <div className="flex items-center justify-between mb-4 pb-4 border-b border-slate-700/50">
                <div className="text-sm text-slate-300">
                  {file.name} • Zoom: {(zoom * 100).toFixed(0)}%
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => setZoom((prev) => Math.max(0.1, prev - 0.2))}
                    className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-400 hover:text-violet-100 transition"
                    title="Zoom Out"
                  >
                    <ZoomOut className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => setZoom((prev) => Math.min(5, prev + 0.2))}
                    className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-400 hover:text-violet-100 transition"
                    title="Zoom In"
                  >
                    <ZoomIn className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleZoomFit}
                    className="p-2 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-400 hover:text-violet-100 transition"
                    title="Fit to View"
                  >
                    <Eye className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* Canvas */}
              {loading ? (
                <div className="h-96 flex items-center justify-center">
                  <div className="text-center">
                    <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-violet-400 mx-auto mb-4"></div>
                    <p className="text-slate-300">Processing file...</p>
                  </div>
                </div>
              ) : (
                <div
                  ref={canvasContainerRef}
                  className="bg-slate-950/60 border border-slate-700 rounded-lg overflow-hidden"
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  onMouseLeave={handleMouseUp}
                  style={{ cursor: isDragging ? 'grabbing' : 'grab' }}
                >
                  <svg
                    ref={canvasRef}
                    width="100%"
                    height="400"
                    viewBox={`0 0 400 300`}
                    style={{
                      transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                      transformOrigin: '0 0',
                    }}
                  >
                    {/* Grid */}
                    <defs>
                      <pattern id="grid" width="50" height="50" patternUnits="userSpaceOnUse">
                        <path d="M 50 0 L 0 0 0 50" fill="none" stroke="#334155" strokeWidth="0.5" />
                      </pattern>
                    </defs>
                    <rect width="400" height="300" fill="url(#grid)" />

                    {flattenedEntities.map((entity, index) => renderEntity(entity, index))}
                  </svg>
                </div>
              )}

              {!loading && flattenedEntities.length === 0 && (
                <div className="mt-3 text-xs text-slate-400">
                  No renderable entities found for preview. Analysis and validation results are still available.
                </div>
              )}

              {error && (
                <div className="mt-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg text-rose-200 text-sm">
                  {error}
                </div>
              )}
            </motion.div>
          </div>

          {/* Sidebar */}
          <div className="space-y-4">
            {/* File Info */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
              className="glass-card border border-violet-400/30 rounded-xl p-4"
            >
              <h3 className="text-sm font-semibold text-violet-200 mb-3">File Info</h3>
              <div className="space-y-2 text-sm">
                <div>
                  <div className="text-slate-400">Format</div>
                  <div className="text-white">{fileData?.format.toUpperCase()}</div>
                </div>
                {fileData?.entity_count && (
                  <div>
                    <div className="text-slate-400">Entities</div>
                    <div className="text-white">{fileData.entity_count}</div>
                  </div>
                )}
                {fileData?.layer_count && (
                  <div>
                    <div className="text-slate-400">Layers</div>
                    <div className="text-white">{fileData.layer_count}</div>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Analysis Stats */}
            {analysis && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
                className="glass-card border border-cyan-400/30 rounded-xl p-4"
              >
                <h3 className="text-sm font-semibold text-cyan-200 mb-3">Analysis</h3>
                <div className="space-y-2 text-sm">
                  <div>
                    <div className="text-slate-400">Shapes</div>
                    <div className="text-white">{analysis.total_entities}</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Area</div>
                    <div className="text-white">{analysis.total_area.toFixed(2)} mm²</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Perimeter</div>
                    <div className="text-white">{analysis.total_perimeter.toFixed(2)} mm</div>
                  </div>
                  <div>
                    <div className="text-slate-400">Complexity</div>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
                          style={{ width: `${Math.min(100, analysis.complexity_score)}%` }}
                        ></div>
                      </div>
                      <span className="text-white text-xs">{analysis.complexity_score}</span>
                    </div>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Validation Status */}
            {validation && (
              <motion.div
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
                className={`glass-card border rounded-xl p-4 ${
                  validation.is_valid ? 'border-emerald-400/30' : 'border-rose-400/30'
                }`}
              >
                <h3 className="text-sm font-semibold mb-3 flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${validation.is_valid ? 'bg-emerald-400' : 'bg-rose-400'}`}></div>
                  <span className={validation.is_valid ? 'text-emerald-200' : 'text-rose-200'}>
                    {validation.is_valid ? 'Valid' : 'Issues Found'}
                  </span>
                </h3>

                {validation.issues.length > 0 && (
                  <div className="space-y-2">
                    {validation.issues.slice(0, 3).map((issue, i) => (
                      <div key={i} className="text-xs p-2 rounded bg-slate-900/50 border border-slate-700">
                        <div className={`font-semibold ${
                          issue.severity === 'error'
                            ? 'text-rose-200'
                            : issue.severity === 'warning'
                            ? 'text-amber-200'
                            : 'text-cyan-200'
                        }`}>
                          {issue.type}
                        </div>
                        <div className="text-slate-400 mt-1">{issue.description}</div>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            )}

            {/* Upload New */}
            <motion.button
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
              onClick={() => {
                setFile(null);
                setFileData(null);
                setAnalysis(null);
                setValidation(null);
              }}
              className="w-full py-2 px-4 rounded-lg border border-slate-700 text-slate-300 hover:border-violet-400 hover:text-violet-100 transition text-sm"
            >
              Upload New File
            </motion.button>
          </div>
        </div>
      )}
    </div>
  );
}
