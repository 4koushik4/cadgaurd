import { useState } from 'react';
import { Sparkles, Play, Copy, Download, ChevronDown } from 'lucide-react';
import { motion } from 'framer-motion';
import { generateCompleteDesign, CompleteDesignResponse } from '../lib/backendApi';

export function AIDesignCreatorPage() {
  const [prompt, setPrompt] = useState('');
  const [designType, setDesignType] = useState<'auto' | '2d' | '3d'>('auto');
  const [loading, setLoading] = useState(false);
  const [design, setDesign] = useState<CompleteDesignResponse | null>(null);
  const [error, setError] = useState('');
  const [selectedTab, setSelectedTab] = useState<'concept' | '3d' | '2d' | 'export'>('concept');

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
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate design');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(prompt);
  };

  const examplePrompts = [
    'Design a bracket for mounting a sensor',
    'Create a floor plan for a small office space',
    'Design a gear with 20 teeth',
    'Create a phone stand holder',
    'Design an L-shaped support bracket',
  ];

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2 flex items-center gap-2">
          <Sparkles className="w-8 h-8 text-cyan-400" />
          AI Design Creator
        </h1>
        <p className="text-slate-300">Generate 2D and 3D designs using AI</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Input Panel */}
        <div className="lg:col-span-1 space-y-4">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="glass-card border border-cyan-400/30 rounded-xl p-6"
          >
            <h2 className="text-lg font-semibold text-white mb-4">Design Brief</h2>

            {/* Design Type Selection */}
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

            {/* Prompt Input */}
            <textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Describe the design you want to create..."
              className="w-full h-32 bg-slate-950/60 border border-slate-700 rounded-lg p-3 text-white placeholder-slate-500 focus:border-cyan-400 focus:outline-none transition"
            />

            {/* Action Buttons */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className="flex-1 flex items-center justify-center gap-2 bg-gradient-to-r from-cyan-500/80 via-violet-500/70 to-fuchsia-500/80 text-white font-semibold py-2.5 rounded-lg hover:shadow-lg hover:shadow-cyan-500/50 disabled:opacity-50 transition"
              >
                <Play className="w-4 h-4" />
                {loading ? 'Generating...' : 'Generate'}
              </button>
              <button
                onClick={handleCopyPrompt}
                disabled={!prompt}
                className="px-3 py-2.5 border border-slate-700 text-slate-300 rounded-lg hover:border-cyan-400 hover:text-cyan-100 transition"
              >
                <Copy className="w-4 h-4" />
              </button>
            </div>

            {error && (
              <div className="mt-4 p-3 bg-rose-500/10 border border-rose-400/30 rounded-lg text-rose-200 text-sm">
                {error}
              </div>
            )}

            {/* Example Prompts */}
            {!design && (
              <div className="mt-6 pt-6 border-t border-slate-700">
                <p className="text-xs text-slate-400 mb-3">Example Prompts:</p>
                <div className="space-y-2">
                  {examplePrompts.map((example, i) => (
                    <button
                      key={i}
                      onClick={() => setPrompt(example)}
                      className="w-full text-left text-xs p-2 rounded-lg bg-slate-900/40 hover:bg-slate-900/70 text-slate-300 hover:text-cyan-200 transition border border-slate-700/50 hover:border-cyan-400/30"
                    >
                      "{example}"
                    </button>
                  ))}
                </div>
              </div>
            )}
          </motion.div>
        </div>

        {/* Results Panel */}
        {design && (
          <div className="lg:col-span-2 space-y-4">
            {/* Tabs */}
            <div className="flex gap-2 bg-slate-950/40 p-1 rounded-lg border border-slate-700/50">
              {(['concept', '3d', '2d', 'export'] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => setSelectedTab(tab)}
                  className={`flex-1 py-2 px-3 rounded-lg text-sm font-medium transition ${
                    selectedTab === tab
                      ? 'bg-cyan-500/20 text-cyan-100 border border-cyan-400/30'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {tab === 'concept' && 'Design Concept'}
                  {tab === '3d' && '3D Render'}
                  {tab === '2d' && '2D Render'}
                  {tab === 'export' && 'Export'}
                </button>
              ))}
            </div>

            {/* Tab Content */}
            <motion.div
              key={selectedTab}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2 }}
              className="glass-card border border-cyan-400/20 rounded-xl p-6 min-h-96"
            >
              {selectedTab === 'concept' && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">Design Type</h3>
                    <p className="text-white font-bold text-lg">
                      {design.design_concept.type === '3d' ? '3D Model' : '2D Drawing'}
                    </p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">Description</h3>
                    <p className="text-slate-200">{design.design_concept.description}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">Dimensions</h3>
                    <p className="text-slate-200">{design.design_concept.dimensions}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">Structure</h3>
                    <p className="text-slate-200">{design.design_concept.structure}</p>
                  </div>

                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">Recommendations</h3>
                    <p className="text-slate-200">{design.design_concept.recommendations}</p>
                  </div>

                  <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">Complexity</h3>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-2 bg-slate-900 rounded-full overflow-hidden">
                        <div
                          className="h-full bg-gradient-to-r from-cyan-400 to-violet-400"
                          style={{
                            width:
                              design.design_concept.rendering_hints.complexity_level === 'simple'
                                ? '33%'
                                : design.design_concept.rendering_hints.complexity_level === 'moderate'
                                ? '66%'
                                : '100%',
                          }}
                        ></div>
                      </div>
                      <span className="text-sm text-slate-300 capitalize">
                        {design.design_concept.rendering_hints.complexity_level}
                      </span>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === '3d' && design.rendering_3d && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">3D Primitives</h3>
                    <p className="text-slate-300 mb-4">{design.rendering_3d.total_primitives} shapes</p>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {design.rendering_3d.primitives.map((prim, i) => (
                        <div key={i} className="bg-slate-900/50 border border-slate-700 p-3 rounded-lg text-sm">
                          <div className="flex items-center gap-2 mb-1">
                            <div
                              className="w-4 h-4 rounded"
                              style={{ backgroundColor: prim.color }}
                            ></div>
                            <span className="font-semibold text-white capitalize">{prim.type}</span>
                          </div>
                          <p className="text-slate-400 text-xs">
                            Position: [{prim.position.join(', ')}]
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                  <div className="pt-4 border-t border-slate-700">
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">Bounding Box</h3>
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                        <div className="text-slate-400">Min X</div>
                        <div className="font-semibold text-white">
                          {design.rendering_3d.bounding_box.min_x.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                        <div className="text-slate-400">Max X</div>
                        <div className="font-semibold text-white">
                          {design.rendering_3d.bounding_box.max_x.toFixed(1)}
                        </div>
                      </div>
                      <div className="bg-slate-900/50 p-2 rounded border border-slate-700">
                        <div className="text-slate-400">Size</div>
                        <div className="font-semibold text-white">
                          {(
                            design.rendering_3d.bounding_box.max_x - design.rendering_3d.bounding_box.min_x
                          ).toFixed(1)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {selectedTab === '2d' && design.rendering_2d && (
                <div className="space-y-4">
                  <div>
                    <h3 className="text-sm font-semibold text-cyan-200 mb-2">2D Shapes</h3>
                    <p className="text-slate-300 mb-4">{design.rendering_2d.total_shapes} shapes</p>
                    <div className="bg-slate-900/60 border border-slate-700 rounded-lg p-4 mb-4">
                      <svg
                        width="100%"
                        height="250"
                        viewBox="0 0 400 300"
                        className="border border-slate-700 rounded-lg"
                        style={{ backgroundColor: '#0f172a' }}
                      >
                        {design.rendering_2d.shapes.map((shape, i) => {
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
                          } else if (shape.type === 'circle') {
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
                          } else if (shape.type === 'polygon') {
                            return (
                              <polygon
                                key={i}
                                points={shape.points}
                                fill={shape.color}
                                stroke={shape.stroke || '#666'}
                                strokeWidth={shape.stroke_width || 1}
                              />
                            );
                          } else if (shape.type === 'path') {
                            return (
                              <path
                                key={i}
                                d={shape.d}
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
                  </div>
                </div>
              )}

              {selectedTab === 'export' && (
                <div className="space-y-4">
                  <h3 className="text-sm font-semibold text-cyan-200 mb-4">Recommended Export Formats</h3>
                  <div className="space-y-2">
                    {design.export_options.recommended_formats.map((format, i) => (
                      <motion.div
                        key={i}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: i * 0.05 }}
                        className={`p-3 rounded-lg border transition ${
                          format.recommended
                            ? 'bg-cyan-500/10 border-cyan-400/30 hover:bg-cyan-500/20'
                            : 'bg-slate-900/50 border-slate-700 hover:bg-slate-900/70'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="font-semibold text-white flex items-center gap-2">
                              {format.format}
                              {format.recommended && (
                                <span className="text-xs px-2 py-1 bg-cyan-500/20 border border-cyan-400/50 rounded-full text-cyan-200">
                                  Recommended
                                </span>
                              )}
                            </h4>
                            <p className="text-sm text-slate-400">{format.description}</p>
                          </div>
                          <Download className="w-5 h-5 text-cyan-400 opacity-60" />
                        </div>
                      </motion.div>
                    ))}
                  </div>
                </div>
              )}
            </motion.div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="lg:col-span-2 glass-card border border-cyan-400/20 rounded-xl p-12 flex items-center justify-center">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cyan-400 mx-auto mb-4"></div>
              <p className="text-slate-300">Generating your design...</p>
              <p className="text-xs text-slate-500 mt-2">This may take a few seconds</p>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!design && !loading && (
          <div className="lg:col-span-2 glass-card border border-cyan-400/20 rounded-xl p-12 flex items-center justify-center text-center">
            <div>
              <Sparkles className="w-12 h-12 text-cyan-400 opacity-30 mx-auto mb-4" />
              <p className="text-slate-300 mb-2">Create your first design</p>
              <p className="text-xs text-slate-500">Describe what you want to build and AI will generate it for you</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
