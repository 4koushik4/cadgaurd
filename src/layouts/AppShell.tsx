import { Bell, Bot, FolderKanban, Gauge, GitCompareArrows, LogOut, Settings, Sparkles } from 'lucide-react';
import { motion } from 'framer-motion';
import { NavLink, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';
import { useState } from 'react';
import { NotificationsDropdown } from '../components/NotificationsDropdown';

const navItems = [
  { to: '/dashboard', label: 'Dashboard', icon: Gauge },
  { to: '/projects', label: 'Projects', icon: FolderKanban },
  { to: '/compare', label: 'Compare', icon: GitCompareArrows },
  { to: '/copilot', label: 'AI Copilot', icon: Bot },
  { to: '/reports', label: 'Reports', icon: Sparkles },
  { to: '/settings', label: 'Settings', icon: Settings },
];

export function AppShell() {
  const { user, signOut } = useAuth();
  const { stats, liveValidations, unreadNotifications } = useAppData();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);

  return (
    <div className="min-h-screen animated-grid">
      <div className="flex min-h-screen">
        <aside className="w-72 border-r border-cyan-500/20 bg-slate-950/65 backdrop-blur-xl p-5">
          <div className="mb-7">
            <h1 className="text-2xl font-bold text-white">CADGuard AI</h1>
            <p className="text-xs text-cyan-200/80">Engineering Intelligence Platform</p>
          </div>

          <nav className="space-y-2">
            {navItems.map((item) => {
              const Icon = item.icon;
              return (
                <NavLink
                  key={item.to}
                  to={item.to}
                  className={({ isActive }) =>
                    `flex items-center gap-3 px-3 py-2 rounded-lg border transition ${
                      isActive
                        ? 'bg-cyan-500/18 border-cyan-300/45 text-cyan-100 shadow-[0_0_20px_rgba(0,240,255,0.2)]'
                        : 'bg-slate-900/40 border-slate-700/60 text-slate-300 hover:border-cyan-400/35 hover:text-cyan-100'
                    }`
                  }
                >
                  <Icon className="w-4 h-4" />
                  <span>{item.label}</span>
                </NavLink>
              );
            })}
          </nav>

          <div className="mt-8 glass-card rounded-xl p-4 border border-violet-400/25">
            <p className="text-xs text-violet-200">Live Validations</p>
            <p className="text-3xl font-bold text-white">{stats.activeValidations}</p>
            <div className="mt-3 space-y-2 max-h-48 overflow-y-auto">
              {liveValidations.length === 0 ? (
                <p className="text-[11px] text-slate-400">No recent runs</p>
              ) : (
                liveValidations.map((run) => (
                  <div key={run.id} className="rounded-lg border border-slate-700/70 bg-slate-900/60 px-2 py-1.5">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-[11px] text-slate-200 truncate">{run.validation_type.replace(/_/g, ' ')}</span>
                      <span className={`text-[10px] px-1.5 py-0.5 rounded-full border ${
                        run.status === 'running'
                          ? 'border-cyan-300/40 text-cyan-200'
                          : run.status === 'completed'
                          ? 'border-emerald-300/40 text-emerald-200'
                          : run.status === 'failed'
                          ? 'border-rose-300/40 text-rose-200'
                          : 'border-amber-300/40 text-amber-200'
                      }`}>
                        {run.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <div className="flex-1 min-w-0">
          <header className="h-16 border-b border-slate-700/70 bg-slate-950/50 backdrop-blur-xl px-6 flex items-center justify-between">
            <div>
              <p className="text-xs text-slate-400">Signed in</p>
              <p className="text-sm text-slate-100 font-medium">{user?.email}</p>
            </div>

            <div className="flex items-center gap-3 relative">
              <button
                onClick={() => setShowNotifications((v) => !v)}
                className="relative p-2 rounded-lg border border-cyan-400/30 bg-cyan-500/10 text-cyan-200 hover:bg-cyan-500/20 transition"
              >
                <Bell className="w-4 h-4" />
                {unreadNotifications > 0 && (
                  <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 text-[10px] rounded-full bg-rose-500 text-white flex items-center justify-center">
                    {Math.min(unreadNotifications, 9)}
                  </span>
                )}
              </button>
              <NotificationsDropdown open={showNotifications} />
              <button
                onClick={signOut}
                className="flex items-center gap-2 px-3 py-2 rounded-lg border border-fuchsia-400/35 bg-fuchsia-500/10 text-fuchsia-100 hover:bg-fuchsia-500/20 transition"
              >
                <LogOut className="w-4 h-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </header>

          <motion.main
            key={location.pathname}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.25 }}
            className="p-6"
          >
            <Outlet />
          </motion.main>
        </div>
      </div>
    </div>
  );
}
