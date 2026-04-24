import { createContext, ReactNode, useContext, useEffect, useMemo, useState } from 'react';
import { supabase } from '../lib/supabase';
import { useAuth } from './AuthContext';
import type {
  AICopilotResponse,
  AppNotification,
  DashboardStats,
  LiveValidationRun,
  Project,
  UserPreferences,
} from '../types/domain';

interface AppDataContextType {
  projects: Project[];
  stats: DashboardStats;
  liveValidations: LiveValidationRun[];
  notifications: AppNotification[];
  unreadNotifications: number;
  preferences: UserPreferences;
  loading: boolean;
  aiByProject: Record<string, AICopilotResponse>;
  refreshProjectsAndStats: () => Promise<void>;
  refreshNotifications: () => Promise<void>;
  addNotification: (input: {
    type: AppNotification['type'];
    title: string;
    message: string;
    level?: AppNotification['level'];
    metadata?: Record<string, unknown>;
  }) => Promise<void>;
  markAllNotificationsRead: () => Promise<void>;
  updatePreferences: (patch: Partial<UserPreferences>) => Promise<void>;
  setAICopilotResult: (projectId: string, result: AICopilotResponse) => void;
}

const defaultStats: DashboardStats = {
  totalProjects: 0,
  activeValidations: 0,
  criticalIssues: 0,
  avgQualityScore: 0,
};

const defaultPreferences: UserPreferences = {
  theme: 'neon',
  ai_enabled: true,
  notify_validation: true,
  notify_simulation: true,
  notify_ai_alerts: true,
};

const AppDataContext = createContext<AppDataContextType | undefined>(undefined);

export function AppDataProvider({ children }: { children: ReactNode }) {
  const { user } = useAuth();
  const [projects, setProjects] = useState<Project[]>([]);
  const [stats, setStats] = useState<DashboardStats>(defaultStats);
  const [liveValidations, setLiveValidations] = useState<LiveValidationRun[]>([]);
  const [notifications, setNotifications] = useState<AppNotification[]>([]);
  const [preferences, setPreferences] = useState<UserPreferences>(defaultPreferences);
  const [loading, setLoading] = useState(true);
  const [aiByProject, setAIByProject] = useState<Record<string, AICopilotResponse>>({});

  const refreshProjectsAndStats = async () => {
    const [{ data: projectsData }, { data: validationsData }, { data: issuesData }, { data: runningValidations }] = await Promise.all([
      supabase.from('projects').select('*').order('created_at', { ascending: false }),
      supabase.from('validations').select('id, status').in('status', ['pending', 'running']),
      supabase.from('issues').select('severity').eq('severity', 'high').eq('status', 'open'),
      supabase
        .from('validations')
        .select('id, project_id, validation_type, status, total_issues, critical_issues, warnings, created_at')
        .in('status', ['pending', 'running', 'completed', 'failed'])
        .order('created_at', { ascending: false })
        .limit(8),
    ]);

    const rows = (projectsData || []) as Project[];
    const liveRows = ((runningValidations || []) as LiveValidationRun[]).filter((row) =>
      ['pending', 'running', 'completed', 'failed'].includes(row.status)
    );

    setProjects(rows);
    setLiveValidations(liveRows);

    const avg = rows.reduce((acc, item) => acc + (item.quality_score || 0), 0) / (rows.length || 1);
    const processingProjects = rows.filter((item) => item.status === 'processing').length;
    const activeValidationRows = liveRows.filter((row) => row.status === 'pending' || row.status === 'running').length;
    setStats({
      totalProjects: rows.length,
      activeValidations: Math.max(validationsData?.length || 0, activeValidationRows, processingProjects),
      criticalIssues: issuesData?.length || 0,
      avgQualityScore: Math.round(avg),
    });
  };

  const refreshNotifications = async () => {
    const { data } = await supabase
      .from('notifications')
      .select('id, user_id, type, title, message, level, is_read, metadata, created_at')
      .order('created_at', { ascending: false })
      .limit(20);

    setNotifications((data || []) as AppNotification[]);
  };

  const loadPreferences = async () => {
    if (!user) {
      setPreferences(defaultPreferences);
      return;
    }

    const { data, error } = await supabase
      .from('user_preferences')
      .select('theme, ai_enabled, notify_validation, notify_simulation, notify_ai_alerts')
      .eq('user_id', user.id)
      .maybeSingle();

    if (error) {
      setPreferences(defaultPreferences);
      return;
    }

    if (!data) {
      await supabase.from('user_preferences').upsert({ user_id: user.id, ...defaultPreferences });
      setPreferences(defaultPreferences);
      return;
    }

    setPreferences(data as UserPreferences);
  };

  const addNotification = async (input: {
    type: AppNotification['type'];
    title: string;
    message: string;
    level?: AppNotification['level'];
    metadata?: Record<string, unknown>;
  }) => {
    if (!user) return;

    await supabase.from('notifications').insert({
      user_id: user.id,
      type: input.type,
      title: input.title,
      message: input.message,
      level: input.level || 'info',
      metadata: input.metadata || {},
    });
    await refreshNotifications();
  };

  const markAllNotificationsRead = async () => {
    if (!notifications.length) return;

    const unreadIds = notifications.filter((n) => !n.is_read).map((n) => n.id);
    if (!unreadIds.length) return;

    await supabase.from('notifications').update({ is_read: true }).in('id', unreadIds);
    await refreshNotifications();
  };

  const updatePreferences = async (patch: Partial<UserPreferences>) => {
    if (!user) return;
    const next = { ...preferences, ...patch };
    setPreferences(next);
    await supabase.from('user_preferences').upsert({ user_id: user.id, ...next });
  };

  useEffect(() => {
    if (!user) {
      setProjects([]);
      setStats(defaultStats);
      setLiveValidations([]);
      setNotifications([]);
      setPreferences(defaultPreferences);
      setLoading(false);
      return;
    }

    (async () => {
      try {
        await Promise.all([refreshProjectsAndStats(), refreshNotifications(), loadPreferences()]);
      } finally {
        setLoading(false);
      }
    })();

    const channel = supabase
      .channel('appdata-live')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'projects' }, refreshProjectsAndStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'validations' }, refreshProjectsAndStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'issues' }, refreshProjectsAndStats)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'notifications' }, refreshNotifications)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'user_preferences' }, loadPreferences)
      .subscribe();

    const pollingId = window.setInterval(() => {
      void refreshProjectsAndStats();
    }, 15000);

    return () => {
      supabase.removeChannel(channel);
      window.clearInterval(pollingId);
    };
  }, [user]);

  useEffect(() => {
    const body = document.body;
    if (preferences.theme === 'dark') {
      body.classList.add('theme-muted');
    } else {
      body.classList.remove('theme-muted');
    }
  }, [preferences.theme]);

  const setAICopilotResult = (projectId: string, result: AICopilotResponse) => {
    setAIByProject((current) => ({ ...current, [projectId]: result }));
  };

  const unreadNotifications = useMemo(
    () => notifications.filter((item) => !item.is_read).length,
    [notifications]
  );

  return (
    <AppDataContext.Provider
      value={{
        projects,
        stats,
        liveValidations,
        notifications,
        unreadNotifications,
        preferences,
        loading,
        aiByProject,
        refreshProjectsAndStats,
        refreshNotifications,
        addNotification,
        markAllNotificationsRead,
        updatePreferences,
        setAICopilotResult,
      }}
    >
      {children}
    </AppDataContext.Provider>
  );
}

export function useAppData() {
  const context = useContext(AppDataContext);
  if (!context) {
    throw new Error('useAppData must be used within AppDataProvider');
  }
  return context;
}
