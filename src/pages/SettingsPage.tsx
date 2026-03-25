import { Bell, Bot, MoonStar, Palette, Sparkles, UserCircle2 } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useAppData } from '../contexts/AppDataContext';

export function SettingsPage() {
  const { user } = useAuth();
  const { preferences, updatePreferences } = useAppData();

  return (
    <div className="space-y-5">
      <div className="glass-card rounded-xl border border-slate-700/70 p-6 space-y-5">
        <div className="flex items-center gap-2">
          <Palette className="w-5 h-5 text-cyan-300" />
          <h2 className="text-xl font-semibold text-white">Settings</h2>
        </div>

        <div className="rounded-lg border border-violet-400/30 bg-violet-500/10 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-violet-100">Theme Mode</p>
              <p className="text-xs text-slate-300">Switch between neon and dark visual environments.</p>
            </div>
            <button
              onClick={() => void updatePreferences({ theme: preferences.theme === 'neon' ? 'dark' : 'neon' })}
              className="flex items-center gap-2 px-3 py-2 rounded-lg border border-cyan-400/40 bg-cyan-500/10 text-cyan-200"
            >
              {preferences.theme === 'neon' ? <Sparkles className="w-4 h-4" /> : <MoonStar className="w-4 h-4" />}
              {preferences.theme === 'neon' ? 'Neon' : 'Dark'}
            </button>
          </div>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-slate-700/70 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Bot className="w-5 h-5 text-emerald-300" />
          <p className="text-white font-semibold">AI Settings</p>
        </div>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-slate-100">Enable AI Copilot</p>
            <p className="text-xs text-slate-300">Allow AI chatbot, copilot, and auto-fix recommendations.</p>
          </div>
          <button
            onClick={() => void updatePreferences({ ai_enabled: !preferences.ai_enabled })}
            className="flex items-center gap-2 px-3 py-2 rounded-lg border border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
          >
            {preferences.ai_enabled ? 'Enabled' : 'Disabled'}
          </button>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-slate-700/70 p-6">
        <div className="flex items-center gap-2 mb-3">
          <Bell className="w-5 h-5 text-cyan-300" />
          <p className="text-white font-semibold">Notification Preferences</p>
        </div>

        <div className="space-y-3 text-sm">
          <label className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-900/50 p-3">
            <span className="text-slate-200">Validation completed</span>
            <input type="checkbox" checked={preferences.notify_validation} onChange={() => void updatePreferences({ notify_validation: !preferences.notify_validation })} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-900/50 p-3">
            <span className="text-slate-200">Simulation results</span>
            <input type="checkbox" checked={preferences.notify_simulation} onChange={() => void updatePreferences({ notify_simulation: !preferences.notify_simulation })} />
          </label>
          <label className="flex items-center justify-between rounded-lg border border-slate-700/80 bg-slate-900/50 p-3">
            <span className="text-slate-200">AI alerts</span>
            <input type="checkbox" checked={preferences.notify_ai_alerts} onChange={() => void updatePreferences({ notify_ai_alerts: !preferences.notify_ai_alerts })} />
          </label>
        </div>
      </div>

      <div className="glass-card rounded-xl border border-slate-700/70 p-6">
        <div className="flex items-center gap-2 mb-3">
          <UserCircle2 className="w-5 h-5 text-violet-300" />
          <p className="text-white font-semibold">Account</p>
        </div>
        <p className="text-sm text-slate-300">Email</p>
        <p className="text-sm text-slate-100 mt-1">{user?.email || 'Unknown user'}</p>
      </div>
    </div>
  );
}
