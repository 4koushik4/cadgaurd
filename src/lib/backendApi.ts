export interface BackendValidationIssue {
  rule_id: string;
  status: string;
  severity: 'high' | 'medium' | 'low';
  explanation: string;
  measured_value?: number | null;
  expected_value?: number | null;
  unit?: string | null;
}

export interface BackendValidationSummary {
  pass_status: boolean;
  total_issues: number;
  high_issues: number;
  medium_issues: number;
  low_issues: number;
  quality_score: number;
}

export interface BackendSimulationPoint {
  x: number;
  y: number;
  z: number;
  stress: number;
}

export interface BackendSimulationResult {
  material: string;
  max_stress: number;
  avg_stress: number;
  risk_level: string;
  weak_regions: Array<{ face_index: number; risk_score: number }>;
  stress_map: BackendSimulationPoint[];
  digital_twin_summary: string;
}

export interface BackendValidateResponse {
  geometry: {
    vertices: number;
    faces: number;
    bounding_box_min: number[];
    bounding_box_max: number[];
    extents: number[];
    volume: number;
    surface_area: number;
    is_watertight: boolean;
    estimated_wall_thickness_mm: number;
    non_manifold_edges: number;
    inconsistent_normals: boolean;
  };
  validation_issues: BackendValidationIssue[];
  summary: BackendValidationSummary;
  ai_insight: {
    explanation: string;
    suggestions: string[];
  };
}

export interface BackendSimulateResponse {
  geometry: BackendValidateResponse['geometry'];
  simulation: BackendSimulationResult;
  ai_insight: {
    explanation: string;
    suggestions: string[];
  };
}

export interface BackendAICopilotResponse {
  summary: string;
  issues: string[];
  suggestions: string[];
  risks: string[];
}

export interface BackendChatbotResponse {
  reply: string;
  quick_actions: string[];
}

export interface BackendAutoFixSuggestion {
  issue: string;
  probable_cause: string;
  recommended_fix: string;
  target_value?: string | null;
}

export interface BackendAutoFixResponse {
  summary: string;
  fixes: BackendAutoFixSuggestion[];
}

const API_BASE = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

async function fetchCadAsFile(fileUrl: string, fileFormat: string): Promise<File> {
  const response = await fetch(fileUrl);
  if (!response.ok) {
    throw new Error('Failed to fetch CAD file for processing');
  }

  const blob = await response.blob();
  return new File([blob], `model.${fileFormat}`, { type: blob.type || 'application/octet-stream' });
}

async function runValidationWithFile(file: File): Promise<BackendValidateResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/validate`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Backend validation failed');
  }

  return payload as BackendValidateResponse;
}

async function runSimulationWithFile(file: File, material: string): Promise<BackendSimulateResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('material', material);

  const response = await fetch(`${API_BASE}/simulate`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Backend simulation failed');
  }

  return payload as BackendSimulateResponse;
}

export async function runBackendValidation(fileUrl: string, fileFormat: string): Promise<BackendValidateResponse> {
  const file = await fetchCadAsFile(fileUrl, fileFormat);
  return runValidationWithFile(file);
}

export async function runBackendSimulation(
  fileUrl: string,
  fileFormat: string,
  material: string
): Promise<BackendSimulateResponse> {
  const file = await fetchCadAsFile(fileUrl, fileFormat);
  return runSimulationWithFile(file, material);
}

export async function runBackendValidationForFile(file: File): Promise<BackendValidateResponse> {
  return runValidationWithFile(file);
}

export async function runBackendSimulationForFile(file: File, material: string): Promise<BackendSimulateResponse> {
  return runSimulationWithFile(file, material);
}

export async function runBackendAICopilot(input: {
  validation_results: Record<string, unknown>;
  simulation_results: Record<string, unknown>;
  geometry_stats: Record<string, unknown>;
}): Promise<BackendAICopilotResponse> {
  const response = await fetch(`${API_BASE}/ai-copilot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'AI copilot analysis failed');
  }

  return payload as BackendAICopilotResponse;
}

export async function runBackendChatbot(input: {
  user_input: string;
  validation_results: Record<string, unknown>;
  simulation_results: Record<string, unknown>;
}): Promise<BackendChatbotResponse> {
  const response = await fetch(`${API_BASE}/chatbot`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Chatbot request failed');
  }

  return payload as BackendChatbotResponse;
}

export async function runBackendAutoFix(input: {
  validation_issues: Array<Record<string, unknown>>;
}): Promise<BackendAutoFixResponse> {
  const response = await fetch(`${API_BASE}/ai-autofix`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(input),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'AI auto-fix failed');
  }

  return payload as BackendAutoFixResponse;
}
