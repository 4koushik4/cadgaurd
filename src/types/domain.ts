export interface Project {
  id: string;
  name: string;
  description: string;
  file_format: string;
  file_url: string;
  quality_score: number;
  status: string;
  created_at: string;
}

export interface DashboardStats {
  totalProjects: number;
  activeValidations: number;
  criticalIssues: number;
  avgQualityScore: number;
}

export interface AICopilotResponse {
  summary: string;
  issues: string[];
  suggestions: string[];
  risks: string[];
}

export interface LiveValidationRun {
  id: string;
  project_id: string;
  validation_type: string;
  status: 'pending' | 'running' | 'completed' | 'failed';
  total_issues: number;
  critical_issues: number;
  warnings: number;
  created_at: string;
}

export interface AppNotification {
  id: string;
  user_id: string;
  type: 'validation' | 'simulation' | 'ai_alert' | 'system';
  title: string;
  message: string;
  level: 'info' | 'success' | 'warning' | 'error';
  is_read: boolean;
  metadata: Record<string, unknown>;
  created_at: string;
}

export interface UserPreferences {
  theme: 'neon' | 'dark';
  ai_enabled: boolean;
  notify_validation: boolean;
  notify_simulation: boolean;
  notify_ai_alerts: boolean;
}
