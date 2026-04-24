import { motion } from 'framer-motion';
import { ArrowRight, Bot, Boxes, GaugeCircle, ShieldCheck, Sparkles, CheckCircle, Zap, BarChart3, Wrench, Ruler } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden bg-black">
      {/* Enhanced gradient background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_10%_20%,rgba(0,240,255,0.15),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,0,200,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(138,46,255,0.2),transparent_35%)]" />
        <div className="absolute top-0 right-0 w-96 h-96 bg-violet-600/20 rounded-full filter blur-3xl opacity-40" />
        <div className="absolute bottom-0 left-1/4 w-96 h-96 bg-cyan-600/20 rounded-full filter blur-3xl opacity-40" />
      </div>

      {/* Header */}
      <header className="relative z-10 sticky top-0 px-6 py-4 border-b border-cyan-400/10 bg-slate-950/40 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-cyan-400 to-violet-500 flex items-center justify-center">
              <Zap className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg font-bold bg-gradient-to-r from-cyan-200 to-violet-200 bg-clip-text text-transparent">CADGuard AI</h1>
              <p className="text-xs text-cyan-200/60">Design Validation Platform</p>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="px-4 py-2 rounded-lg text-cyan-200/90 hover:text-cyan-200 hover:bg-cyan-500/5 transition text-sm font-medium">
              Sign In
            </Link>
            <Link to="/auth" className="px-5 py-2 rounded-lg bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 text-white text-sm font-semibold hover:shadow-lg hover:shadow-cyan-500/30 transition">
              Start Free
            </Link>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="relative z-10 max-w-7xl mx-auto px-6 py-20 space-y-24">
        {/* Hero Section */}
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-cyan-500/10 border border-cyan-400/30 text-cyan-100 text-xs mb-5 font-medium">
              <Sparkles className="w-3.5 h-3.5" />
              Trusted by Engineering Teams
            </div>
            
            <h2 className="text-6xl leading-tight font-bold text-white mb-5">
              Intelligent CAD
              <br />
              <span className="bg-gradient-to-r from-cyan-400 via-violet-400 to-fuchsia-400 bg-clip-text text-transparent">Validation</span>
            </h2>
            
            <p className="text-lg text-slate-300 max-w-xl mb-8 leading-relaxed">
              Validate 3D geometry in seconds, simulate structural risks, repair mesh defects, and optimize designs with AI-powered analysis. Enterprise-grade reliability for mechanical engineers.
            </p>

            <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4">
              <Link to="/auth" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg bg-gradient-to-r from-cyan-500 to-violet-500 text-white font-semibold hover:shadow-xl hover:shadow-cyan-500/40 transition transform hover:scale-105">
                Launch Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#features" className="inline-flex items-center gap-2 px-6 py-3 rounded-lg border border-slate-600 text-slate-300 font-medium hover:border-cyan-400/50 hover:text-cyan-300 transition">
                Explore Features
              </a>
            </div>

            <div className="mt-12 grid grid-cols-2 gap-6">
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Real-time Analysis</p>
                  <p className="text-xs text-slate-400">Instant validation results</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">DFM Optimized</p>
                  <p className="text-xs text-slate-400">Manufacturing ready</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">AI Copilot</p>
                  <p className="text-xs text-slate-400">Intelligent guidance</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
                <div>
                  <p className="text-sm font-semibold text-white">Mesh Repair</p>
                  <p className="text-xs text-slate-400">Auto-fix defects</p>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Hero Demo Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="relative"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/20 to-violet-500/20 rounded-2xl blur-3xl" />
            <div className="relative rounded-2xl border border-cyan-400/20 bg-slate-950/80 backdrop-blur p-6">
              <div className="absolute top-4 right-4 flex gap-1.5">
                <div className="w-3 h-3 rounded-full bg-red-500/60" />
                <div className="w-3 h-3 rounded-full bg-yellow-500/60" />
                <div className="w-3 h-3 rounded-full bg-green-500/60" />
              </div>
              
              <div className="aspect-video rounded-lg border border-slate-700/60 bg-gradient-to-br from-slate-900 to-slate-950 p-4 relative overflow-hidden mb-4">
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(0,240,255,0.15),transparent_35%),radial-gradient(circle_at_15%_80%,rgba(255,0,200,0.15),transparent_40%)]" />
                <div className="relative h-full flex items-center justify-center">
                  <div className="text-center">
                    <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-400/40 mx-auto mb-3 flex items-center justify-center">
                      <BarChart3 className="w-6 h-6 text-cyan-400" />
                    </div>
                    <p className="text-sm text-slate-300">3D CAD Analysis</p>
                    <p className="text-xs text-slate-500 mt-1">Geometry • Stress • Mesh Quality</p>
                  </div>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
                  <p className="text-xs text-slate-400 mb-1">Volume</p>
                  <p className="text-sm font-semibold text-cyan-300">245.8 mm³</p>
                </div>
                <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-3">
                  <p className="text-xs text-slate-400 mb-1">Surface Area</p>
                  <p className="text-sm font-semibold text-violet-300">1,240 mm²</p>
                </div>
              </div>
            </div>
          </motion.div>
        </section>

        {/* Core Features Section */}
        <section id="features" className="space-y-8">
          <div className="text-center mb-12">
            <h3 className="text-3xl font-bold text-white mb-3">Core 3D CAD Tools</h3>
            <p className="text-lg text-slate-400 max-w-2xl mx-auto">Professional-grade geometry analysis and design optimization</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Geometry Analysis */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
              className="group rounded-xl border border-cyan-400/20 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur p-6 transition"
            >
              <div className="w-12 h-12 rounded-lg bg-cyan-500/20 border border-cyan-400/40 flex items-center justify-center mb-4 group-hover:bg-cyan-500/30 transition">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
              </div>
              <h4 className="text-white font-bold mb-2 text-lg">Geometry Analysis</h4>
              <p className="text-slate-300 text-sm mb-4">Comprehensive 3D model metrics and properties</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
                  Volume & Surface Area calculation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
                  Bounding box and extents
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
                  Wall thickness estimation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400/60" />
                  Section view generation
                </li>
              </ul>
            </motion.div>

            {/* Mesh Repair */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.5 }}
              className="group rounded-xl border border-violet-400/20 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur p-6 transition"
            >
              <div className="w-12 h-12 rounded-lg bg-violet-500/20 border border-violet-400/40 flex items-center justify-center mb-4 group-hover:bg-violet-500/30 transition">
                <Wrench className="w-6 h-6 text-violet-400" />
              </div>
              <h4 className="text-white font-bold mb-2 text-lg">Mesh Repair</h4>
              <p className="text-slate-300 text-sm mb-4">Detect and fix mesh defects automatically</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                  Hole & cavity detection
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                  Non-manifold edge fixing
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                  Normal vector correction
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-violet-400/60" />
                  Vertex deduplication
                </li>
              </ul>
            </motion.div>

            {/* Measurement Tool */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.5 }}
              className="group rounded-xl border border-fuchsia-400/20 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur p-6 transition"
            >
              <div className="w-12 h-12 rounded-lg bg-fuchsia-500/20 border border-fuchsia-400/40 flex items-center justify-center mb-4 group-hover:bg-fuchsia-500/30 transition">
                <Ruler className="w-6 h-6 text-fuchsia-400" />
              </div>
              <h4 className="text-white font-bold mb-2 text-lg">Measurement Tool</h4>
              <p className="text-slate-300 text-sm mb-4">Precise distance and angle measurements</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/60" />
                  3D point-to-point distance
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/60" />
                  Vector angle calculation
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/60" />
                  Diameter measurement
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-fuchsia-400/60" />
                  Sharp edge detection
                </li>
              </ul>
            </motion.div>

            {/* DFM Checker */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.5 }}
              className="group rounded-xl border border-orange-400/20 bg-slate-900/40 hover:bg-slate-900/60 backdrop-blur p-6 transition"
            >
              <div className="w-12 h-12 rounded-lg bg-orange-500/20 border border-orange-400/40 flex items-center justify-center mb-4 group-hover:bg-orange-500/30 transition">
                <ShieldCheck className="w-6 h-6 text-orange-400" />
              </div>
              <h4 className="text-white font-bold mb-2 text-lg">DFM Checker</h4>
              <p className="text-slate-300 text-sm mb-4">Design for manufacturing validation</p>
              <ul className="space-y-2 text-sm text-slate-400">
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" />
                  Wall thickness rules
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" />
                  Manufacturability checks
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" />
                  Material-specific rules
                </li>
                <li className="flex items-center gap-2">
                  <span className="w-1.5 h-1.5 rounded-full bg-orange-400/60" />
                  Draft angle validation
                </li>
              </ul>
            </motion.div>
          </div>
        </section>

        {/* AI Validation Section */}
        <section className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.1, duration: 0.5 }}
            className="lg:col-span-2 rounded-xl border border-slate-700 bg-slate-900/50 backdrop-blur p-8"
          >
            <div className="flex items-center gap-3 mb-4">
              <Bot className="w-6 h-6 text-cyan-400" />
              <h3 className="text-xl font-bold text-white">AI-Powered Validation</h3>
            </div>
            <p className="text-slate-300 mb-6">
              Combines deterministic engineering rules with AI reasoning to validate designs in seconds. Get instant fixes, root causes, and optimization strategies.
            </p>
            <div className="grid grid-cols-2 gap-4">
              <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-4">
                <p className="text-xs text-slate-400 mb-2">Validation Types</p>
                <ul className="text-sm text-slate-200 space-y-1">
                  <li>✓ Geometry checks</li>
                  <li>✓ Structural rules</li>
                  <li>✓ Mesh quality</li>
                </ul>
              </div>
              <div className="rounded-lg bg-slate-900/60 border border-slate-700 p-4">
                <p className="text-xs text-slate-400 mb-2">AI Features</p>
                <ul className="text-sm text-slate-200 space-y-1">
                  <li>✓ Root cause analysis</li>
                  <li>✓ Auto-fix suggestions</li>
                  <li>✓ Optimization ideas</li>
                </ul>
              </div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.2, duration: 0.5 }}
            className="rounded-xl border border-slate-700 bg-gradient-to-br from-slate-900/60 to-slate-950/60 backdrop-blur p-8 flex flex-col justify-between"
          >
            <div>
              <GaugeCircle className="w-8 h-8 text-violet-400 mb-4" />
              <h4 className="text-lg font-bold text-white mb-3">Stress Simulation</h4>
              <p className="text-sm text-slate-300">
                Fast FEM-style stress analysis with weak-region mapping and safety factor calculations.
              </p>
            </div>
            <div className="mt-6 pt-6 border-t border-slate-700/50">
              <p className="text-xs text-slate-500 mb-2">Supported Materials</p>
              <div className="flex flex-wrap gap-2">
                <span className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">Aluminum</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">Steel</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">Titanium</span>
                <span className="text-xs px-2 py-1 rounded bg-slate-900 border border-slate-700 text-slate-300">Plastics</span>
              </div>
            </div>
          </motion.div>
        </section>

        {/* CTA Section */}
        <section className="relative rounded-2xl border border-slate-700 bg-gradient-to-r from-cyan-600/10 via-violet-600/10 to-fuchsia-600/10 overflow-hidden backdrop-blur">
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,rgba(0,240,255,0.2),transparent_50%)]" />
          <div className="relative p-8 md:p-12 flex flex-col md:flex-row md:items-center md:justify-between gap-8">
            <div>
              <p className="text-sm text-cyan-300 font-semibold mb-2">🚀 Get Started Today</p>
              <h3 className="text-3xl md:text-4xl font-bold text-white max-w-lg">
                Ship better mechanical designs faster with CADGuard AI.
              </h3>
              <p className="text-slate-300 mt-3 text-lg">
                Join engineering teams that validate, simulate, and optimize with confidence.
              </p>
            </div>
            <Link to="/auth" className="inline-flex items-center gap-2 px-7 py-4 rounded-lg bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 text-white font-bold text-lg hover:shadow-2xl hover:shadow-cyan-500/50 transition transform hover:scale-105 whitespace-nowrap flex-shrink-0">
              Start Building
              <Boxes className="w-5 h-5" />
            </Link>
          </div>
        </section>

        {/* Footer Stats */}
        <section className="grid grid-cols-2 md:grid-cols-4 gap-6 border-t border-slate-700 pt-16">
          <div className="text-center">
            <p className="text-3xl font-bold text-cyan-400 mb-1">2.5K+</p>
            <p className="text-sm text-slate-400">Active Users</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-violet-400 mb-1">50K+</p>
            <p className="text-sm text-slate-400">Models Validated</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-fuchsia-400 mb-1">100%</p>
            <p className="text-sm text-slate-400">Uptime SLA</p>
          </div>
          <div className="text-center">
            <p className="text-3xl font-bold text-emerald-400 mb-1">&lt;2s</p>
            <p className="text-sm text-slate-400">Validation Time</p>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="relative z-10 border-t border-slate-700 bg-slate-950/50 backdrop-blur px-6 py-8 mt-20">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-8">
            <div>
              <h4 className="text-white font-semibold mb-4">Product</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#features" className="hover:text-slate-200 transition">Features</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">Pricing</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">Documentation</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Company</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200 transition">About</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">Blog</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">Contact</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Legal</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200 transition">Privacy</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">Terms</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">Security</a></li>
              </ul>
            </div>
            <div>
              <h4 className="text-white font-semibold mb-4">Connect</h4>
              <ul className="space-y-2 text-sm text-slate-400">
                <li><a href="#" className="hover:text-slate-200 transition">Twitter</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">LinkedIn</a></li>
                <li><a href="#" className="hover:text-slate-200 transition">GitHub</a></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-slate-700 pt-8 flex flex-col md:flex-row items-center justify-between gap-4">
            <p className="text-sm text-slate-500">© 2024 CADGuard AI. All rights reserved.</p>
            <div className="flex items-center gap-4 text-sm text-slate-500">
              <span>Made for engineers, by engineers</span>
              <span>•</span>
              <span>Enterprise security certified</span>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
}
