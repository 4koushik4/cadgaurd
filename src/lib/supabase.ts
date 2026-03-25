import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export interface Database {
  public: {
    Tables: {
      projects: {
        Row: {
          id: string;
          user_id: string;
          name: string;
          description: string;
          file_format: string;
          file_url: string;
          file_path: string | null;
          file_size: number;
          quality_score: number;
          status: string;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
        Insert: Omit<Database['public']['Tables']['projects']['Row'], 'id' | 'created_at' | 'updated_at'>;
        Update: Partial<Database['public']['Tables']['projects']['Insert']>;
      };
      validations: {
        Row: {
          id: string;
          project_id: string;
          validation_type: string;
          status: string;
          total_issues: number;
          critical_issues: number;
          warnings: number;
          info_count: number;
          execution_time: number;
          created_at: string;
        };
      };
      issues: {
        Row: {
          id: string;
          validation_id: string;
          project_id: string;
          rule_id: string;
          severity: string;
          category: string;
          title: string;
          description: string;
          measured_value: number | null;
          expected_value: number | null;
          unit: string;
          location: Record<string, unknown>;
          ai_explanation: string;
          ai_suggestion: string;
          status: string;
          created_at: string;
        };
      };
      simulation_results: {
        Row: {
          id: string;
          project_id: string;
          simulation_type: string;
          load_conditions: Record<string, unknown>;
          material_properties: Record<string, unknown>;
          max_stress: number;
          max_displacement: number;
          safety_factor: number;
          failure_prediction: Record<string, unknown>;
          visualization_data: Record<string, unknown>;
          passed: boolean;
          created_at: string;
        };
      };
      design_history: {
        Row: {
          id: string;
          user_id: string;
          issue_pattern: string;
          fix_applied: string;
          success_rate: number;
          usage_count: number;
          category: string;
          metadata: Record<string, unknown>;
          created_at: string;
          updated_at: string;
        };
      };
      reports: {
        Row: {
          id: string;
          project_id: string;
          validation_id: string | null;
          report_type: string;
          format: string;
          file_url: string;
          content: Record<string, unknown>;
          created_at: string;
        };
      };
    };
  };
}
