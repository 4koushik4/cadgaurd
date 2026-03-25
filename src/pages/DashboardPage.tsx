import { AlertTriangle, CheckCircle, FolderOpen, Activity } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAppData } from '../contexts/AppDataContext';

export function DashboardPage() {
  const { stats, projects, liveValidations, notifications, aiByProject } = useAppData();

  const trendValues = projects.slice(0, 8).map((p) => Math.max(5, Math.min(100, Number(p.quality_score || 0))));
  const trendMax = Math.max(...trendValues, 100);
  const trendPoints = trendValues
    .map((value, idx) => `${(idx / Math.max(trendValues.length - 1, 1)) * 100},${100 - (value / trendMax) * 100}`)
    .join(' ');

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card neon-border-cyan rounded-xl p-5">
          <FolderOpen className="w-7 h-7 text-cyan-300 mb-2" />
          <p className="text-3xl font-bold text-white">{stats.totalProjects}</p>
          <p className="text-sm text-slate-300">Total Projects</p>
        </div>
        <div className="glass-card neon-border-purple rounded-xl p-5">
          <Activity className="w-7 h-7 text-violet-300 mb-2" />
          <p className="text-3xl font-bold text-white">{stats.activeValidations}</p>
          <p className="text-sm text-slate-300">Active Validations</p>
        </div>
        <div className="glass-card neon-border-pink rounded-xl p-5">
          <AlertTriangle className="w-7 h-7 text-pink-300 mb-2" />
          <p className="text-3xl font-bold text-white">{stats.criticalIssues}</p>
          <p className="text-sm text-slate-300">Critical Issues</p>
        </div>
        <div className="glass-card border border-emerald-400/30 rounded-xl p-5">
          <CheckCircle className="w-7 h-7 text-emerald-300 mb-2" />
          <p className="text-3xl font-bold text-white">{stats.avgQualityScore}%</p>
          <p className="text-sm text-slate-300">Avg Quality Score</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 border border-cyan-400/25 lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-white font-semibold">Validation Trend</h3>
            <p className="text-xs text-slate-400">Recent quality trajectory</p>
          </div>
          <div className="h-40 rounded-lg border border-slate-700/70 bg-slate-900/45 p-3">
            {trendValues.length > 1 ? (
              <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="w-full h-full">
                <polyline fill="none" stroke="rgba(0,240,255,0.9)" strokeWidth="2.5" points={trendPoints} />
              </svg>
            ) : (
              <p className="text-sm text-slate-400">Not enough data for trend chart yet.</p>
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-emerald-400/25">
          <h3 className="text-white font-semibold mb-3">System Health</h3>
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between"><span className="text-slate-300">API Status</span><span className="text-emerald-300">Operational</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-300">Validation Queue</span><span className="text-cyan-200">{stats.activeValidations}</span></div>
            <div className="flex items-center justify-between"><span className="text-slate-300">AI Copilot</span><span className="text-emerald-300">Online</span></div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="glass-card rounded-xl p-5 border border-slate-700/70">
          <h3 className="text-white font-semibold mb-3">Recent Validations</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {liveValidations.length === 0 ? (
              <p className="text-sm text-slate-400">No recent validations.</p>
            ) : (
              liveValidations.map((run) => (
                <div key={run.id} className="rounded-lg border border-slate-700/70 bg-slate-900/45 px-3 py-2">
                  <p className="text-xs text-slate-200">{run.validation_type.replace(/_/g, ' ')}</p>
                  <p className="text-xs text-slate-400">{new Date(run.created_at).toLocaleString()} - {run.status}</p>
                </div>
              ))
            )}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-700/70">
          <h3 className="text-white font-semibold mb-3">Activity Feed</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {notifications.slice(0, 8).map((item) => (
              <div key={item.id} className="rounded-lg border border-slate-700/70 bg-slate-900/45 px-3 py-2">
                <p className="text-xs text-slate-100">{item.title}</p>
                <p className="text-xs text-slate-400">{item.message}</p>
              </div>
            ))}
            {notifications.length === 0 && <p className="text-sm text-slate-400">No activity events yet.</p>}
          </div>
        </div>

        <div className="glass-card rounded-xl p-5 border border-slate-700/70">
          <h3 className="text-white font-semibold mb-3">AI Insights Preview</h3>
          <div className="space-y-2 max-h-64 overflow-y-auto">
            {Object.entries(aiByProject).slice(0, 6).map(([projectId, ai]) => (
              <div key={projectId} className="rounded-lg border border-cyan-400/25 bg-cyan-500/10 px-3 py-2">
                <p className="text-xs text-cyan-100">Project {projectId.slice(0, 8)}</p>
                <p className="text-xs text-slate-200 line-clamp-3">{ai.summary}</p>
              </div>
            ))}
            {Object.keys(aiByProject).length === 0 && <p className="text-sm text-slate-400">No AI insights captured yet.</p>}
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl p-6 border border-slate-700/70">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-semibold text-white">Recent Projects</h2>
          <Link
            to="/projects"
            className="px-3 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition"
          >
            Manage Projects
          </Link>
        </div>

        {projects.length === 0 ? (
          <p className="text-slate-400 text-sm">No projects yet. Upload your first CAD model from Projects.</p>
        ) : (
          <div className="space-y-2">
            {projects.slice(0, 5).map((project) => (
              <Link
                key={project.id}
                to={`/projects/${project.id}`}
                className="flex items-center justify-between rounded-lg border border-slate-700/70 bg-slate-900/45 px-3 py-2 hover:border-cyan-400/35 transition"
              >
                <div>
                  <p className="text-sm font-medium text-slate-100">{project.name}</p>
                  <p className="text-xs text-slate-400">{project.file_format.toUpperCase()} • {new Date(project.created_at).toLocaleDateString()}</p>
                </div>
                <p className="text-sm text-cyan-200">{project.quality_score}%</p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
