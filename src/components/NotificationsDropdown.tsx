import { BellRing } from 'lucide-react';
import { useAppData } from '../contexts/AppDataContext';

interface NotificationsDropdownProps {
  open: boolean;
}

export function NotificationsDropdown({ open }: NotificationsDropdownProps) {
  const { notifications, markAllNotificationsRead } = useAppData();

  if (!open) return null;

  return (
    <div className="absolute right-0 top-11 w-96 max-w-[calc(100vw-2rem)] rounded-xl border border-cyan-400/30 bg-slate-950/95 backdrop-blur-xl shadow-2xl z-40 overflow-hidden">
      <div className="flex items-center justify-between px-4 py-3 border-b border-slate-700">
        <p className="text-sm font-medium text-white">Notifications</p>
        <button
          onClick={() => void markAllNotificationsRead()}
          className="text-xs text-cyan-200 hover:text-cyan-100"
        >
          Mark all read
        </button>
      </div>

      <div className="max-h-80 overflow-y-auto">
        {!notifications.length ? (
          <div className="px-4 py-8 text-center text-slate-400 text-sm">
            <BellRing className="w-6 h-6 mx-auto mb-2 text-slate-500" />
            No notifications yet.
          </div>
        ) : (
          notifications.map((item) => (
            <div
              key={item.id}
              className={`px-4 py-3 border-b border-slate-800/70 ${item.is_read ? 'bg-transparent' : 'bg-cyan-500/10'}`}
            >
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-sm text-slate-100">{item.title}</p>
                  <p className="text-xs text-slate-300 mt-1">{item.message}</p>
                </div>
                <span className="text-[10px] text-slate-400">{new Date(item.created_at).toLocaleTimeString()}</span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
