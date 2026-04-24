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

export const API_BASE = import.meta.env.VITE_FASTAPI_URL || 'http://localhost:8000';

export function resolveBackendUrl(pathOrUrl: string): string {
  if (!pathOrUrl) return pathOrUrl;
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl;
  }
  if (pathOrUrl.startsWith('/')) {
    return `${API_BASE}${pathOrUrl}`;
  }
  return `${API_BASE}/${pathOrUrl}`;
}

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

// Advanced 3D Geometry Analysis APIs
export interface SectionViewResponse {
  success: boolean;
  section_count?: number;
  message?: string;
  properties?: Record<string, unknown>;
}

export interface HoleDetectionResult {
  has_cavities: boolean;
  cavity_volume: number;
  cavity_percentage: number;
  convex_volume: number;
  mesh_volume: number;
  message?: string;
}

export interface MeshRepairResult {
  success: boolean;
  issues_fixed: string[];
  vertices_removed: number;
  faces_removed: number;
  is_watertight_before: boolean;
  is_watertight_after: boolean;
}

export interface MeasurementResult {
  distance?: number;
  point1?: number[];
  point2?: number[];
  angle_degrees?: number;
  angle_radians?: number;
  vector1?: number[];
  vector2?: number[];
  units?: string;
}

export interface SharpEdgeDetectionResult {
  sharp_edges_count: number;
  threshold_degrees: number;
  sharp_edges: Array<{ edge: number[]; angle_degrees: number; vertex_count: number }>;
}

export interface SurfaceFeatures {
  average_edge_length: number;
  total_edges: number;
  euler_characteristic: number;
  genus: number;
  is_manifold: boolean;
  triangles: number;
}

export async function analyzeGeometrySection(
  file: File,
  planeNormal: [number, number, number]
): Promise<SectionViewResponse> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('plane_normal_x', planeNormal[0].toString());
  formData.append('plane_normal_y', planeNormal[1].toString());
  formData.append('plane_normal_z', planeNormal[2].toString());

  const response = await fetch(`${API_BASE}/geometry/section-view`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Section view analysis failed');
  }

  return payload as SectionViewResponse;
}

export async function detectHolesInGeometry(file: File): Promise<HoleDetectionResult> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/geometry/detect-holes`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Hole detection failed');
  }

  return payload as HoleDetectionResult;
}

export async function repairMesh(file: File): Promise<MeshRepairResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('remove_unreferenced', 'true');
  formData.append('merge_duplicates', 'true');
  formData.append('fix_normals', 'true');

  const response = await fetch(`${API_BASE}/geometry/repair`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Mesh repair failed');
  }

  return payload as MeshRepairResult;
}

export async function measureDistance(
  file: File,
  p1: [number, number, number],
  p2: [number, number, number]
): Promise<MeasurementResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('p1_x', p1[0].toString());
  formData.append('p1_y', p1[1].toString());
  formData.append('p1_z', p1[2].toString());
  formData.append('p2_x', p2[0].toString());
  formData.append('p2_y', p2[1].toString());
  formData.append('p2_z', p2[2].toString());

  const response = await fetch(`${API_BASE}/geometry/measure-distance`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Distance measurement failed');
  }

  return payload as MeasurementResult;
}

export async function measureAngle(v1: [number, number, number], v2: [number, number, number]): Promise<MeasurementResult> {
  const formData = new FormData();
  formData.append('v1_x', v1[0].toString());
  formData.append('v1_y', v1[1].toString());
  formData.append('v1_z', v1[2].toString());
  formData.append('v2_x', v2[0].toString());
  formData.append('v2_y', v2[1].toString());
  formData.append('v2_z', v2[2].toString());

  const response = await fetch(`${API_BASE}/geometry/measure-angle`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Angle measurement failed');
  }

  return payload as MeasurementResult;
}

export async function detectSharpEdges(file: File, threshold: number = 20): Promise<SharpEdgeDetectionResult> {
  const formData = new FormData();
  formData.append('file', file);
  formData.append('angle_threshold', threshold.toString());

  const response = await fetch(`${API_BASE}/geometry/detect-sharp-edges`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Sharp edge detection failed');
  }

  return payload as SharpEdgeDetectionResult;
}

export async function analyzeSurfaceFeatures(file: File): Promise<SurfaceFeatures> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/geometry/surface-features`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Surface features analysis failed');
  }

  return payload as SurfaceFeatures;
}

// 2D CAD APIs
export interface CAD2DFileResponse {
  format: string;
  layer_count?: number;
  path_count?: number;
  entity_count?: number;
  layers?: Record<string, unknown>;
  paths?: unknown[];
  bounding_box: {
    min_x: number;
    min_y: number;
    max_x: number;
    max_y: number;
    width: number;
    height: number;
  };
  metadata: Record<string, unknown>;
}

export interface Geometry2DAnalysis {
  total_entities: number;
  lines: number;
  circles: number;
  polygons: number;
  total_perimeter: number;
  total_area: number;
  bounding_box: Record<string, number>;
  complexity_score: number;
}

export interface Geometry2DValidation {
  is_valid: boolean;
  total_issues: number;
  errors: number;
  warnings: number;
  info: number;
  issues: Array<{
    type: string;
    severity: string;
    description: string;
    entity_type?: string;
    entity_count?: number;
  }>;
}

export interface Measurement2D {
  distance?: number;
  point1?: number[];
  point2?: number[];
  delta_x?: number;
  delta_y?: number;
  angle_degrees?: number;
  angle_radians?: number;
  vector1?: number[];
  vector2?: number[];
  units?: string;
}

export async function load2DFile(file: File): Promise<CAD2DFileResponse> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/2d/load`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || '2D file loading failed');
  }

  return payload as CAD2DFileResponse;
}

export async function analyze2DGeometry(file: File): Promise<Geometry2DAnalysis> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/2d/analyze`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || '2D geometry analysis failed');
  }

  return payload as Geometry2DAnalysis;
}

export async function validate2DGeometry(file: File): Promise<Geometry2DValidation> {
  const formData = new FormData();
  formData.append('file', file);

  const response = await fetch(`${API_BASE}/2d/validate`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || '2D geometry validation failed');
  }

  return payload as Geometry2DValidation;
}

export async function measure2DDistance(p1: [number, number], p2: [number, number]): Promise<Measurement2D> {
  const formData = new FormData();
  formData.append('p1_x', p1[0].toString());
  formData.append('p1_y', p1[1].toString());
  formData.append('p2_x', p2[0].toString());
  formData.append('p2_y', p2[1].toString());

  const response = await fetch(`${API_BASE}/2d/measure-distance`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || '2D distance measurement failed');
  }

  return payload as Measurement2D;
}

export async function measure2DAngle(v1: [number, number], v2: [number, number]): Promise<Measurement2D> {
  const formData = new FormData();
  formData.append('v1_x', v1[0].toString());
  formData.append('v1_y', v1[1].toString());
  formData.append('v2_x', v2[0].toString());
  formData.append('v2_y', v2[1].toString());

  const response = await fetch(`${API_BASE}/2d/measure-angle`, {
    method: 'POST',
    body: formData,
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || '2D angle measurement failed');
  }

  return payload as Measurement2D;
}

// AI Design Creator APIs
export interface AIDesignConcept {
  type: string;
  model: string;
  parameters?: Record<string, unknown>;
  shapes?: Array<Record<string, unknown>>;
  operations: string[];
}

export interface FeatureNode {
  name: string;
  operation: string;
  parameters: Record<string, unknown>;
}

export interface Design3DRendering {
  mesh_url: string;
  bounding_box: Record<string, number>;
  feature_tree: FeatureNode[];
  rendering_notes: string;
  warnings: string[];
}

export interface Shape2D {
  type: string;
  x?: number;
  y?: number;
  width?: number;
  height?: number;
  cx?: number;
  cy?: number;
  r?: number;
  points?: string;
  d?: string;
  color: string;
  stroke?: string;
  stroke_width?: number;
}

export interface Design2DRendering {
  shapes: Shape2D[];
  total_shapes: number;
  canvas_size: { width: number; height: number };
  svg_url?: string;
  feature_tree: FeatureNode[];
  rendering_notes: string;
  warnings: string[];
}

export interface CompleteDesignResponse {
  design_concept: AIDesignConcept;
  rendering_3d?: Design3DRendering;
  rendering_2d?: Design2DRendering;
  validation_summary?: BackendValidationSummary;
  validation_issues: BackendValidationIssue[];
  export_options: {
    recommended_formats: Array<{
      format: string;
      description: string;
      recommended: boolean;
      file_extension: string;
    }>;
    design_type: string;
    notes: string;
  };
}

export async function generateDesign(prompt: string, designType: string = 'auto'): Promise<AIDesignConcept> {
  const response = await fetch(`${API_BASE}/design/generate`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_prompt: prompt, design_type: designType }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Design generation failed');
  }

  return payload as AIDesignConcept;
}

export async function renderDesign3D(prompt: string, designType: string = 'auto'): Promise<Design3DRendering> {
  const response = await fetch(`${API_BASE}/design/render-3d`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_prompt: prompt, design_type: designType }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || '3D rendering failed');
  }

  return payload as Design3DRendering;
}

export async function renderDesign2D(prompt: string, designType: string = 'auto'): Promise<Design2DRendering> {
  const response = await fetch(`${API_BASE}/design/render-2d`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_prompt: prompt, design_type: designType }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || '2D rendering failed');
  }

  return payload as Design2DRendering;
}

export async function generateCompleteDesign(prompt: string, designType: string = 'auto'): Promise<CompleteDesignResponse> {
  const response = await fetch(`${API_BASE}/design/complete`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ user_prompt: prompt, design_type: designType }),
  });

  const payload = await response.json();
  if (!response.ok) {
    throw new Error(payload?.error?.message || 'Complete design generation failed');
  }

  return payload as CompleteDesignResponse;
}
