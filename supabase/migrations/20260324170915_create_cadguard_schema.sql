/*
  # CADGuard AI - Complete Database Schema

  1. New Tables
    - projects: Stores CAD design projects
    - validations: Stores validation runs
    - issues: Stores detected issues
    - simulation_results: Stores digital twin stress simulations
    - design_history: Stores patterns for self-learning
    - reports: Stores generated reports

  2. Security
    - Enable RLS on all tables
    - Users can only access their own data
*/

-- Projects table
CREATE TABLE IF NOT EXISTS projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  name text NOT NULL,
  description text DEFAULT '',
  file_format text NOT NULL,
  file_url text NOT NULL,
  file_size bigint DEFAULT 0,
  quality_score numeric DEFAULT 0,
  status text DEFAULT 'uploaded',
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own projects"
  ON projects FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own projects"
  ON projects FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own projects"
  ON projects FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete own projects"
  ON projects FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- Validations table
CREATE TABLE IF NOT EXISTS validations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  validation_type text NOT NULL,
  status text DEFAULT 'pending',
  total_issues integer DEFAULT 0,
  critical_issues integer DEFAULT 0,
  warnings integer DEFAULT 0,
  info_count integer DEFAULT 0,
  execution_time numeric DEFAULT 0,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE validations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view validations for own projects"
  ON validations FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = validations.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create validations for own projects"
  ON validations FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = validations.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update validations for own projects"
  ON validations FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = validations.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = validations.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Issues table
CREATE TABLE IF NOT EXISTS issues (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  validation_id uuid REFERENCES validations(id) ON DELETE CASCADE NOT NULL,
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  rule_id text NOT NULL,
  severity text NOT NULL,
  category text NOT NULL,
  title text NOT NULL,
  description text DEFAULT '',
  measured_value numeric,
  expected_value numeric,
  unit text DEFAULT '',
  location jsonb DEFAULT '{}',
  ai_explanation text DEFAULT '',
  ai_suggestion text DEFAULT '',
  status text DEFAULT 'open',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE issues ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view issues for own projects"
  ON issues FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = issues.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create issues for own projects"
  ON issues FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = issues.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update issues for own projects"
  ON issues FOR UPDATE
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = issues.project_id
      AND projects.user_id = auth.uid()
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = issues.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Simulation Results table
CREATE TABLE IF NOT EXISTS simulation_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  simulation_type text NOT NULL,
  load_conditions jsonb DEFAULT '{}',
  material_properties jsonb DEFAULT '{}',
  max_stress numeric DEFAULT 0,
  max_displacement numeric DEFAULT 0,
  safety_factor numeric DEFAULT 0,
  failure_prediction jsonb DEFAULT '{}',
  visualization_data jsonb DEFAULT '{}',
  passed boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE simulation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view simulations for own projects"
  ON simulation_results FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = simulation_results.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create simulations for own projects"
  ON simulation_results FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = simulation_results.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Design History table
CREATE TABLE IF NOT EXISTS design_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users NOT NULL,
  issue_pattern text NOT NULL,
  fix_applied text NOT NULL,
  success_rate numeric DEFAULT 0,
  usage_count integer DEFAULT 0,
  category text NOT NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

ALTER TABLE design_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own design history"
  ON design_history FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

CREATE POLICY "Users can create own design history"
  ON design_history FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own design history"
  ON design_history FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Reports table
CREATE TABLE IF NOT EXISTS reports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid REFERENCES projects(id) ON DELETE CASCADE NOT NULL,
  validation_id uuid REFERENCES validations(id) ON DELETE CASCADE,
  report_type text NOT NULL,
  format text NOT NULL,
  file_url text DEFAULT '',
  content jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

ALTER TABLE reports ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view reports for own projects"
  ON reports FOR SELECT
  TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = reports.project_id
      AND projects.user_id = auth.uid()
    )
  );

CREATE POLICY "Users can create reports for own projects"
  ON reports FOR INSERT
  TO authenticated
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM projects
      WHERE projects.id = reports.project_id
      AND projects.user_id = auth.uid()
    )
  );

-- Create indexes for performance
CREATE INDEX IF NOT EXISTS idx_projects_user_id ON projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_validations_project_id ON validations(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_validation_id ON issues(validation_id);
CREATE INDEX IF NOT EXISTS idx_issues_project_id ON issues(project_id);
CREATE INDEX IF NOT EXISTS idx_issues_severity ON issues(severity);
CREATE INDEX IF NOT EXISTS idx_simulation_project_id ON simulation_results(project_id);
CREATE INDEX IF NOT EXISTS idx_reports_project_id ON reports(project_id);