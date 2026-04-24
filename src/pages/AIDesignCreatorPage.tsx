import { useMemo, useState } from 'react';
import { Sparkles, Play, Copy, Download, Layers3, Wrench, AlertTriangle, CheckCircle2 } from 'lucide-react';
import { motion } from 'framer-motion';
import { CompleteDesignResponse, generateCompleteDesign, resolveBackendUrl } from '../lib/backendApi';
import { DesignMeshViewer } from '../components/DesignMeshViewer';

export function AIDesignCreatorPage() {
  const [prompt, setPrompt] = useState('');
  const [designType, setDesignType] = useState<'auto' | '2d' | '3d'>('auto');
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<CompleteDesignResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<'overview' | '3d' | '2d' | 'validation' | 'export'>('overview');

  const meshUrl = useMemo(() => {
    const raw = design?.rendering_3d?.mesh_url;
    return raw ? resolveBackendUrl(raw) : '';
  }, [design]);

  const svgUrl = useMemo(() => {
    const raw = design?.rendering_2d?.svg_url;
    return raw ? resolveBackendUrl(raw) : '';
  }, [design]);

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      setError('Please enter a design prompt');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await generateCompleteDesign(prompt, designType);
      setDesign(result);
      if (result.rendering_3d) {
        setSelectedTab('3d');
      } else {
        setSelectedTab('2d');
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate design');
    } finally {
      setLoading(false);
    }
  };

  const copyPrompt = async () => {
    await navigator.clipboard.writeText(prompt);
  };

  const prettyJson = (value: unknown) => JSON.stringify(value, null, 2);

  const downloadGeneratedSvg = () => {
    if (!design?.rendering_2d) return;

    const width = design.rendering_2d.canvas_size.width || 400;
    const height = design.rendering_2d.canvas_size.height || 300;

    const parts: string[] = [];
    for (const shape of design.rendering_2d.shapes || []) {
      if (shape.type === 'rectangle') {
        parts.push(
          `<rect x="${shape.x || 0}" y="${shape.y || 0}" width="${shape.width || 0}" height="${shape.height || 0}" fill="${shape.color || 'none'}" stroke="${shape.stroke || '#38bdf8'}" stroke-width="${shape.stroke_width || 1}" />`
        );
      }
      if (shape.type === 'circle') {
        parts.push(
          `<circle cx="${shape.cx || 0}" cy="${shape.cy || 0}" r="${shape.r || 0}" fill="${shape.color || 'none'}" stroke="${shape.stroke || '#f97316'}" stroke-width="${shape.stroke_width || 1}" />`
        );
      }
    }

    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}"><rect x="0" y="0" width="100%" height="100%" fill="#0f172a" />${parts.join('')}</svg>`;
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `cadguard-design-${Date.now()}.svg`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const getExportDownloadUrl = (format: string) => {
    const upper = format.toUpperCase();
    if (upper === 'STL') return meshUrl || '';
    if (upper === 'SVG') return svgUrl || '';
    return '';
  };

  const examplePrompts = [
    'Create a structural mounting bracket for a vibration sensor with two M6 holes and 5 mm wall thickness.',
    'Generate a 2D laser-cut plate with a 120x80 outer rectangle and four corner holes of diameter 8 mm.',
    'Design a compact right-angle support bracket for electronics enclosure installation.',
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-cyan-400" />
          AI Design Creator
        </h1>
        <p className="text-slate-300">Parametric CAD generation with artifact export and engineering validation</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card border border-cyan-400/30 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Design Brief</h2>

            <div className="mb-4">
              <label className="text-sm text-slate-300 block mb-2">Design Type</label>
              <div className="flex gap-2">
                {(['auto', '2d', '3d'] as const).map((type) => (
                  <button
                    key={type}
                    onClick={() => setDesignType(type)}
                    className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                      designType === type
                        ? 'bg-cyan-500/30 border border-cyan-400 text-cyan-100'
                        : 'bg-slate-900/50 border border-slate-700 text-slate-300 hover:border-cyan-400/50'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the part with dimensions, features, and manufacturing intent"
              className="w-full h-40 bg-slate-950/60 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition"
            />

            <div className="mt-4 flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500/85 via-sky-500/75 to-blue-500/85 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg hover:shadow-cyan-500/40 disabled:opacity-50 transition"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Generating...' : 'Generate CAD'}
              </button>
              <button
                onClick={copyPrompt}
                disabled={!prompt}
                className="px-3 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:border-cyan-400 hover:text-cyan-100 transition"
                title="Copy prompt"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg text-rose-200 text-sm">
                {error}
              </div>
            )}

            <div className="mt-6 pt-4 border-t border-slate-700">
              <p className="text-xs text-slate-400 mb-3">Engineering Prompt Examples</p>
              <div className="space-y-2">
                {examplePrompts.map((example, i) => (
                  <button
                    key={i}
                    onClick={() => setPrompt(example)}
                    className="w-full text-left text-xs p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 text-slate-300 hover:text-cyan-200 transition border border-slate-700/50 hover:border-cyan-400/30"
                  >
                    {example}
                  </button>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        <div className="lg:col-span-2 space-y-4">
          {design && (
            <div className="flex gap-2 bg-slate-950/40 p-1 rounded-lg border border-slate-700/50">
              {(['overview', '3d', '2d', 'validation', 'export'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    selectedTab === tab
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'overview' && 'Parametrics'}
                  {tab === '3d' && '3D Preview'}
                  {tab === '2d' && '2D Drawing'}
                  {tab === 'validation' && 'Validation'}
                  {tab === 'export' && 'Exports'}
                </button>
              ))}
            </div>
          )}

          <motion.div
            key={selectedTab}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="glass-card border border-cyan-400/20 rounded-xl p-6 min-h-96"
          >
            {!design && !loading && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <Sparkles className="w-12 h-12 text-cyan-400 opacity-30 mx-auto mb-4" />
                  <p className="text-slate-300 mb-2">Generate a parametric CAD model</p>
                  <p className="text-xs text-slate-500">The output includes feature tree, downloadable artifacts, and validation insights</p>
                </div>
              </div>
            )}

            {loading && (
              <div className="h-full flex items-center justify-center text-center">
                <div>
                  <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
                  <p className="text-slate-300">Generating engineering-grade CAD definition...</p>
                </div>
              </div>
            )}

            {design && selectedTab === 'overview' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Type</div>
                    <div className="text-lg font-semibold text-white mt-1">{design.design_concept.type}</div>
                  </div>
                  <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                    <div className="text-xs uppercase tracking-wide text-slate-400">Model</div>
                    <div className="text-lg font-semibold text-white mt-1">{design.design_concept.model}</div>
                  </div>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-cyan-200 mb-3 flex items-center gap-2">
                    <Layers3 className="w-4 h-4" />
                    Parametric Breakdown
                  </h3>
                  <pre className="text-xs text-slate-200 overflow-auto">{prettyJson(design.design_concept.parameters || design.design_concept.shapes || {})}</pre>
                </div>

                <div className="bg-slate-900/50 border border-slate-700 rounded-lg p-4">
                  <h3 className="text-sm font-semibold text-cyan-200 mb-3 flex items-center gap-2">
                    <Wrench className="w-4 h-4" />
                    Feature Tree
                  </h3>
                  <div className="space-y-2">
                    {design.rendering_3d?.feature_tree?.map((node, i) => (
                      <div key={`f3-${i}`} className="p-3 rounded border border-slate-700 bg-slate-950/50">
                        <div className="text-sm font-semibold text-white">{i + 1}. {node.name}</div>
                        <div className="text-xs text-slate-400">{node.operation}</div>
                      </div>
                    ))}
                    {design.rendering_2d?.feature_tree?.map((node, i) => (
                      <div key={`f2-${i}`} className="p-3 rounded border border-slate-700 bg-slate-950/50">
                        <div className="text-sm font-semibold text-white">{i + 1}. {node.name}</div>
                        <div className="text-xs text-slate-400">{node.operation}</div>
                      </div>
                    ))}
                    {(design.rendering_3d?.feature_tree?.length || 0) + (design.rendering_2d?.feature_tree?.length || 0) === 0 && (
                      <p className="text-sm text-slate-400">No feature nodes returned.</p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {design && selectedTab === '3d' && (
              <div className="space-y-4">
                {meshUrl ? (
                  <>
                    <DesignMeshViewer meshUrl={meshUrl} />
                    <div className="grid grid-cols-2 md:grid-cols-3 gap-3 text-xs">
                      {Object.entries(design.rendering_3d?.bounding_box || {}).map(([key, value]) => (
                        <div key={key} className="bg-slate-900/50 border border-slate-700 rounded-lg p-2">
                          <div className="text-slate-400">{key}</div>
                          <div className="text-white font-semibold">{Number(value).toFixed(2)}</div>
                        </div>
                      ))}
                    </div>
                    {!!design.rendering_3d?.warnings?.length && (
                      <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg text-amber-200 text-sm">
                        {design.rendering_3d.warnings.join(' | ')}
                      </div>
                    )}
                    <a
                      href={meshUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/10 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download STL
                    </a>
                  </>
                ) : (
                  <p className="text-slate-400">No 3D mesh was generated for this request.</p>
                )}
              </div>
            )}

            {design && selectedTab === '2d' && (
              <div className="space-y-4">
                <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4">
                  <svg
                    width="100%"
                    height="320"
                    viewBox={`0 0 ${design.rendering_2d?.canvas_size.width || 400} ${design.rendering_2d?.canvas_size.height || 300}`}
                    className="border border-slate-700 rounded-lg"
                    style={{ backgroundColor: '#0f172a' }}
                  >
                    {(design.rendering_2d?.shapes || []).map((shape, i) => {
                      if (shape.type === 'rectangle') {
                        return (
                          <rect
                            key={i}
                            x={shape.x}
                            y={shape.y}
                            width={shape.width}
                            height={shape.height}
                            fill={shape.color}
                            stroke={shape.stroke || '#666'}
                            strokeWidth={shape.stroke_width || 1}
                          />
                        );
                      }
                      if (shape.type === 'circle') {
                        return (
                          <circle
                            key={i}
                            cx={shape.cx}
                            cy={shape.cy}
                            r={shape.r}
                            fill={shape.color}
                            stroke={shape.stroke || '#666'}
                            strokeWidth={shape.stroke_width || 1}
                          />
                        );
                      }
                      return null;
                    })}
                  </svg>
                </div>

                <div className="flex gap-2">
                  {svgUrl && (
                    <a
                      href={svgUrl}
                      download
                      className="inline-flex items-center gap-2 px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-100 hover:bg-cyan-500/10 transition"
                    >
                      <Download className="w-4 h-4" />
                      Download SVG
                    </a>
                  )}
                </div>

                {!!design.rendering_2d?.warnings?.length && (
                  <div className="p-3 bg-amber-500/10 border border-amber-400/30 rounded-lg text-amber-200 text-sm">
                    {design.rendering_2d.warnings.join(' | ')}
                  </div>
                )}
              </div>
            )}

            {design && selectedTab === 'validation' && (
              <div className="space-y-4">
                {design.validation_summary ? (
                  <>
                    <div className="p-4 rounded-lg border border-slate-700 bg-slate-900/50">
                      <div className="flex items-center gap-2 text-sm mb-2">
                        {design.validation_summary.pass_status ? (
                          <CheckCircle2 className="w-4 h-4 text-emerald-300" />
                        ) : (
                          <AlertTriangle className="w-4 h-4 text-amber-300" />
                        )}
                        <span className="text-slate-200">
                          Quality Score: <span className="font-semibold text-white">{design.validation_summary.quality_score}</span>
                        </span>
                      </div>
                      <div className="grid grid-cols-4 gap-2 text-xs">
                        <div className="p-2 rounded bg-slate-950/70 border border-slate-700 text-center">
                          <div className="text-slate-400">Total</div>
                          <div className="text-white font-semibold">{design.validation_summary.total_issues}</div>
                        </div>
                        <div className="p-2 rounded bg-slate-950/70 border border-slate-700 text-center">
                          <div className="text-slate-400">High</div>
                          <div className="text-rose-200 font-semibold">{design.validation_summary.high_issues}</div>
                        </div>
                        <div className="p-2 rounded bg-slate-950/70 border border-slate-700 text-center">
                          <div className="text-slate-400">Medium</div>
                          <div className="text-amber-200 font-semibold">{design.validation_summary.medium_issues}</div>
                        </div>
                        <div className="p-2 rounded bg-slate-950/70 border border-slate-700 text-center">
                          <div className="text-slate-400">Low</div>
                          <div className="text-cyan-200 font-semibold">{design.validation_summary.low_issues}</div>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-2">
                      {design.validation_issues.map((issue, i) => (
                        <div key={i} className="p-3 rounded border border-slate-700 bg-slate-950/60">
                          <div className="text-sm font-semibold text-white">{issue.rule_id}</div>
                          <div className="text-xs text-slate-300 mt-1">{issue.explanation}</div>
                        </div>
                      ))}
                      {design.validation_issues.length === 0 && (
                        <p className="text-slate-300 text-sm">No validation issues detected.</p>
                      )}
                    </div>
                  </>
                ) : (
                  <p className="text-slate-400">Validation is available for generated 3D meshes only.</p>
                )}
              </div>
            )}

            {design && selectedTab === 'export' && (
              <div className="space-y-3">
                {design.export_options.recommended_formats.map((format, i) => (
                  <div key={i} className="p-3 rounded-lg border border-slate-700 bg-slate-900/50">
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold text-white">{format.format}</h4>
                        <p className="text-xs text-slate-400">{format.description}</p>
                      </div>
                      {format.recommended && (
                        <span className="text-xs px-2 py-1 rounded-full border border-cyan-400/40 text-cyan-200">Recommended</span>
                      )}
                    </div>

                    <div className="mt-3 flex justify-end">
                      {format.format.toUpperCase() === 'SVG' && !getExportDownloadUrl(format.format) ? (
                        <button
                          onClick={downloadGeneratedSvg}
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-cyan-400/40 text-cyan-100 text-xs hover:bg-cyan-500/10 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download SVG
                        </button>
                      ) : getExportDownloadUrl(format.format) ? (
                        <a
                          href={getExportDownloadUrl(format.format)}
                          download
                          className="inline-flex items-center gap-2 px-3 py-1.5 rounded border border-cyan-400/40 text-cyan-100 text-xs hover:bg-cyan-500/10 transition"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Download {format.format.toUpperCase()}
                        </a>
                      ) : (
                        <span className="text-xs text-slate-500">No downloadable artifact generated yet</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
}
