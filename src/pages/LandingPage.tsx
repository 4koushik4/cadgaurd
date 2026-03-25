import { motion } from 'framer-motion';
import { ArrowRight, Bot, Boxes, GaugeCircle, ShieldCheck, Sparkles } from 'lucide-react';
import { Link } from 'react-router-dom';

export function LandingPage() {
  return (
    <div className="min-h-screen relative overflow-hidden">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_10%_20%,rgba(0,240,255,0.15),transparent_35%),radial-gradient(circle_at_80%_10%,rgba(255,0,200,0.18),transparent_30%),radial-gradient(circle_at_50%_100%,rgba(138,46,255,0.2),transparent_35%)]" />
      <header className="relative z-10 px-6 py-5 border-b border-cyan-400/20 bg-slate-950/45 backdrop-blur-xl">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-white">CADGuard AI</h1>
            <p className="text-xs text-cyan-200/80">AI-Powered CAD Validation Platform</p>
          </div>
          <div className="flex items-center gap-3">
            <Link to="/auth" className="px-4 py-2 rounded-lg border border-cyan-400/40 text-cyan-200 hover:bg-cyan-500/10 transition">
              Sign In
            </Link>
            <Link to="/auth" className="px-4 py-2 rounded-lg bg-gradient-to-r from-cyan-500/80 via-violet-500/75 to-fuchsia-500/80 text-white">
              Start Free Trial
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10 max-w-6xl mx-auto px-6 py-14 space-y-16">
        <section className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center">
          <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.45 }}>
            <p className="inline-flex items-center gap-2 text-xs px-3 py-1 rounded-full bg-cyan-500/15 border border-cyan-400/35 text-cyan-100 mb-4">
              <Sparkles className="w-3 h-3" />
              Production AI for Mechanical Teams
            </p>
            <h2 className="text-5xl leading-tight font-bold text-white mb-4">AI-Powered CAD Validation Platform</h2>
            <p className="text-slate-200 max-w-xl mb-8">
              Validate geometry, simulate structural risk, and resolve design defects with a real-time AI copilot built for manufacturing and engineering workflows.
            </p>
            <div className="flex items-center gap-4">
              <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-cyan-500/20 border border-cyan-300/50 text-cyan-100 hover:bg-cyan-500/30 transition">
                Launch Dashboard
                <ArrowRight className="w-4 h-4" />
              </Link>
              <a href="#demo" className="px-5 py-3 rounded-xl border border-slate-500/50 text-slate-200 hover:border-cyan-400/40 transition">
                View Demo
              </a>
            </div>
          </motion.div>

          <motion.div
            id="demo"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.1, duration: 0.55 }}
            className="rounded-2xl border border-cyan-400/30 glass-card p-5"
          >
            <div className="aspect-video rounded-xl border border-slate-700/60 bg-slate-950/70 p-4 relative overflow-hidden">
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_35%,rgba(0,240,255,0.2),transparent_35%),radial-gradient(circle_at_15%_80%,rgba(255,0,200,0.2),transparent_40%)]" />
              <div className="relative h-full grid grid-cols-3 gap-3">
                <div className="rounded-lg border border-cyan-400/35 bg-cyan-500/10" />
                <div className="rounded-lg border border-violet-400/35 bg-violet-500/10" />
                <div className="rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/10" />
              </div>
            </div>
            <p className="text-xs text-slate-300 mt-3">3D Digital Twin preview with stress overlays and AI issue callouts.</p>
          </motion.div>
        </section>

        <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="glass-card rounded-xl p-5 border border-cyan-400/30">
            <ShieldCheck className="w-6 h-6 text-cyan-300 mb-2" />
            <h3 className="text-white font-semibold mb-2">Validation</h3>
            <p className="text-sm text-slate-300">Rule-based and AI-assisted validation with severity scoring and fix recommendations.</p>
          </div>
          <div className="glass-card rounded-xl p-5 border border-violet-400/30">
            <GaugeCircle className="w-6 h-6 text-violet-300 mb-2" />
            <h3 className="text-white font-semibold mb-2">Simulation</h3>
            <p className="text-sm text-slate-300">Fast stress checks, weak region detection, and material-aware risk estimates.</p>
          </div>
          <div className="glass-card rounded-xl p-5 border border-fuchsia-400/30">
            <Bot className="w-6 h-6 text-fuchsia-300 mb-2" />
            <h3 className="text-white font-semibold mb-2">AI Copilot</h3>
            <p className="text-sm text-slate-300">Ask for fixes, root-cause explanations, or optimization ideas with context-aware responses.</p>
          </div>
        </section>

        <section className="rounded-2xl border border-slate-700/70 glass-card p-7 flex flex-col md:flex-row md:items-center md:justify-between gap-5">
          <div>
            <p className="text-sm text-cyan-200/90 mb-1">Ready to ship better designs faster?</p>
            <h3 className="text-2xl font-bold text-white">Turn your CAD reviews into a real AI workflow.</h3>
          </div>
          <Link to="/auth" className="inline-flex items-center gap-2 px-5 py-3 rounded-xl bg-gradient-to-r from-cyan-500/80 via-violet-500/70 to-fuchsia-500/80 text-white">
            Start Building
            <Boxes className="w-4 h-4" />
          </Link>
        </section>
      </main>
    </div>
  );
}
