# CADGuard AI - API Documentation

Complete API reference for CADGuard AI system.

## Base URL

```
https://your-project.supabase.co/functions/v1
```

## Authentication

All API endpoints require authentication using a user session access token:

```http
Authorization: Bearer USER_ACCESS_TOKEN
```

## Edge Functions API

### 1. Design Validation

Runs comprehensive validation checks on a CAD project.

**Endpoint**: `POST /validate-design`

**Request Body**:
```json
{
  "projectId": "uuid-string"
}
```

**Response**:
```json
{
  "success": true,
  "validationId": "validation-uuid",
  "totalIssues": 5,
  "qualityScore": 75
}
```

**Status Codes**:
- `200`: Validation completed successfully
- `400`: Invalid project ID
- `404`: Project not found
- `500`: Server error

**Example**:
```javascript
const response = await fetch(
  `${supabaseUrl}/functions/v1/validate-design`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ projectId: 'abc-123' }),
  }
);

const data = await response.json();
console.log(`Quality Score: ${data.qualityScore}%`);
```

**Validation Rules**:
1. Minimum Wall Thickness (≥2mm)
2. Hole Alignment and Spacing Validation
3. Clearance and Interference Detection
4. Structural Integrity Heuristic
5. Manufacturability (DFM) Check
6. Minimum Fillet Radius (≥1mm)
7. Draft Angle Check (≥2°)

---

### 2. Stress Simulation

Performs digital twin stress analysis on a CAD project.

**Endpoint**: `POST /run-simulation`

**Request Body**:
```json
{
  "projectId": "uuid-string",
  "materialType": "aluminum_6061",
  "force": 1000
}
```

**Parameters**:
- `projectId` (required): UUID of the project
- `materialType` (optional): Material to simulate
  - `aluminum_6061` (default)
  - `steel_1045`
  - `titanium_ti6al4v`
- `force` (optional): Applied force in Newtons (default: 1000)

**Response**:
```json
{
  "success": true,
  "simulationId": "simulation-uuid",
  "passed": true,
  "maxStress": 150.5,
  "safetyFactor": 2.3,
  "failurePoints": 0
}
```

**Response Fields**:
- `success`: Boolean indicating operation success
- `simulationId`: UUID of created simulation record
- `passed`: Whether design passed safety criteria
- `maxStress`: Maximum stress in MPa
- `safetyFactor`: Ratio of yield strength to max stress
- `failurePoints`: Number of predicted failure locations

**Status Codes**:
- `200`: Simulation completed successfully
- `400`: Invalid parameters
- `404`: Project not found
- `500`: Simulation error

**Example**:
```javascript
const response = await fetch(
  `${supabaseUrl}/functions/v1/run-simulation`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      projectId: 'abc-123',
      materialType: 'steel_1045',
      force: 2000
    }),
  }
);

const data = await response.json();
console.log(`Safety Factor: ${data.safetyFactor}`);
```

**Material Properties**:

| Material | Young's Modulus (GPa) | Yield Strength (MPa) | Density (kg/m³) |
|----------|----------------------|---------------------|-----------------|
| Aluminum 6061-T6 | 68.9 | 276 | 2700 |
| Steel 1045 | 200 | 530 | 7850 |
| Titanium Ti-6Al-4V | 113.8 | 880 | 4430 |

---

### 3. AI Analysis

Generates AI-powered explanations and suggestions for detected issues.

**Endpoint**: `POST /ai-analysis`

**Request Body**:
```json
{
  "validationId": "uuid-string",
  "useAI": true
}
```

**Parameters**:
- `validationId` (required): UUID of the validation
- `useAI` (optional): Whether to use OpenAI API (default: false)

**Response**:
```json
{
  "success": true,
  "processedIssues": 5,
  "aiEnabled": true
}
```

**Response Fields**:
- `success`: Boolean indicating operation success
- `processedIssues`: Number of issues processed
- `aiEnabled`: Whether AI API was used

**Status Codes**:
- `200`: Analysis completed successfully
- `400`: Invalid validation ID
- `404`: Validation not found
- `500`: Analysis error

**Example**:
```javascript
const response = await fetch(
  `${supabaseUrl}/functions/v1/ai-analysis`,
  {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${supabaseAnonKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      validationId: 'validation-123',
      useAI: true
    }),
  }
);

const data = await response.json();
console.log(`Processed ${data.processedIssues} issues`);
```

**AI vs Fallback**:
- If OpenAI API is configured: Uses GPT-4 for explanations
- If OpenAI API unavailable: Uses rule-based fallback explanations
- Both provide high-quality, actionable insights

---

### 4. Report Generation

Generates a combined validation and digital twin report, stores it in Supabase Storage, and saves metadata in the reports table.

**Endpoint**: `POST /generate-report`

**Request Body**:
```json
{
  "projectId": "uuid-string",
  "format": "web"
}
```

`format` options:
- `web` (JSON report)
- `pdf` (downloadable PDF report)

**Response**:
```json
{
  "success": true,
  "reportId": "report-uuid",
  "reportUrl": "https://.../storage/v1/object/public/reports/...json",
  "generatedAt": "2026-03-24T20:12:00.000Z"
}
```

---

## Database API (Supabase Client)

### Projects

**List Projects**:
```javascript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .order('created_at', { ascending: false });
```

**Get Project Details**:
```javascript
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .single();
```

**Create Project**:
```javascript
const { data, error } = await supabase
  .from('projects')
  .insert({
    user_id: userId,
    name: 'My Design',
    description: 'Test project',
    file_format: 'stl',
    file_url: 'https://...',
    file_size: 1024000,
    status: 'uploaded',
    quality_score: 0,
    metadata: {}
  });
```

**Update Project**:
```javascript
const { data, error } = await supabase
  .from('projects')
  .update({ quality_score: 85 })
  .eq('id', projectId);
```

---

### Validations

**Get Validation Results**:
```javascript
const { data, error } = await supabase
  .from('validations')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

**Get Latest Validation**:
```javascript
const { data, error } = await supabase
  .from('validations')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false })
  .limit(1)
  .single();
```

---

### Issues

**Get All Issues for Project**:
```javascript
const { data, error } = await supabase
  .from('issues')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

**Get Issues by Severity**:
```javascript
const { data, error } = await supabase
  .from('issues')
  .select('*')
  .eq('project_id', projectId)
  .eq('severity', 'critical')
  .eq('status', 'open');
```

**Update Issue Status**:
```javascript
const { data, error } = await supabase
  .from('issues')
  .update({ status: 'resolved' })
  .eq('id', issueId);
```

---

### Simulation Results

**Get Simulation Results**:
```javascript
const { data, error } = await supabase
  .from('simulation_results')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false });
```

**Get Latest Simulation**:
```javascript
const { data, error } = await supabase
  .from('simulation_results')
  .select('*')
  .eq('project_id', projectId)
  .order('created_at', { ascending: false })
  .limit(1)
  .maybeSingle();
```

---

## File Upload

### Upload CAD File

**Using Supabase Storage**:
```javascript
const fileExt = file.name.split('.').pop();
const fileName = `${Date.now()}-${file.name}`;
const filePath = `${userId}/${fileName}`;

const { error: uploadError } = await supabase.storage
  .from('cad-files')
  .upload(filePath, file);

if (uploadError) throw uploadError;

const { data: { publicUrl } } = supabase.storage
  .from('cad-files')
  .getPublicUrl(filePath);

console.log('File uploaded:', publicUrl);
```

**Supported Formats**:
- `.stl` - Stereolithography
- `.step` / `.stp` - STEP format
- `.obj` - Wavefront OBJ

**File Size Limits**:
- Free tier: 50MB per file
- Pro tier: 5GB per file

---

## Authentication API

### Sign Up

```javascript
const { data, error } = await supabase.auth.signUp({
  email: 'user@example.com',
  password: 'securepassword123',
});
```

### Sign In

```javascript
const { data, error } = await supabase.auth.signInWithPassword({
  email: 'user@example.com',
  password: 'securepassword123',
});
```

### Sign Out

```javascript
const { error } = await supabase.auth.signOut();
```

### Get Current User

```javascript
const { data: { user } } = await supabase.auth.getUser();
```

### Get Session

```javascript
const { data: { session } } = await supabase.auth.getSession();
```

---

## Webhooks (Future Feature)

### Validation Complete Webhook

**Event**: `validation.completed`

**Payload**:
```json
{
  "event": "validation.completed",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "projectId": "uuid",
    "validationId": "uuid",
    "qualityScore": 85,
    "totalIssues": 3,
    "criticalIssues": 0
  }
}
```

### Simulation Complete Webhook

**Event**: `simulation.completed`

**Payload**:
```json
{
  "event": "simulation.completed",
  "timestamp": "2024-01-15T10:35:00Z",
  "data": {
    "projectId": "uuid",
    "simulationId": "uuid",
    "passed": true,
    "safetyFactor": 2.5
  }
}
```

---

## Error Handling

### Error Response Format

```json
{
  "error": "Error message description"
}
```

### Common Error Codes

| Status | Error | Description |
|--------|-------|-------------|
| 400 | Bad Request | Invalid request parameters |
| 401 | Unauthorized | Missing or invalid authentication |
| 403 | Forbidden | User doesn't have access |
| 404 | Not Found | Resource doesn't exist |
| 500 | Internal Server Error | Server-side error |

### Error Handling Example

```javascript
try {
  const response = await fetch(endpoint, options);

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.error || 'Request failed');
  }

  const data = await response.json();
  return data;
} catch (error) {
  console.error('API Error:', error.message);
  // Handle error appropriately
}
```

---

## Rate Limiting

Current rate limits (subject to change):

- **Edge Functions**: 500,000 invocations/month (free tier)
- **Database Queries**: Unlimited (connection pooled)
- **Storage**: 1 GB storage (free tier)
- **Bandwidth**: 2 GB/month (free tier)

---

## Best Practices

### 1. Use Batch Operations

Instead of multiple individual queries:
```javascript
// Good
const { data } = await supabase
  .from('issues')
  .insert([issue1, issue2, issue3]);

// Avoid
await supabase.from('issues').insert(issue1);
await supabase.from('issues').insert(issue2);
await supabase.from('issues').insert(issue3);
```

### 2. Use Select Filters

Only fetch needed columns:
```javascript
// Good
const { data } = await supabase
  .from('projects')
  .select('id, name, quality_score');

// Avoid
const { data } = await supabase
  .from('projects')
  .select('*');
```

### 3. Handle Errors Gracefully

```javascript
const { data, error } = await supabase
  .from('projects')
  .select('*');

if (error) {
  console.error('Database error:', error);
  // Show user-friendly message
  return;
}

// Process data
```

### 4. Use maybeSingle() for Optional Results

```javascript
// When expecting 0 or 1 result
const { data, error } = await supabase
  .from('projects')
  .select('*')
  .eq('id', projectId)
  .maybeSingle();
```

### 5. Optimize Queries with Indexes

All foreign keys are indexed automatically. For custom queries, contact admin.

---

## SDK Examples

### JavaScript/TypeScript

```typescript
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_ANON_KEY!
);

// Use the client
const { data } = await supabase
  .from('projects')
  .select('*');
```

### Python

```python
from supabase import create_client, Client

supabase: Client = create_client(
    supabase_url,
    supabase_key
)

# Query data
response = supabase.table('projects').select('*').execute()
```

### cURL

```bash
curl -X POST \
  'https://your-project.supabase.co/functions/v1/validate-design' \
  -H 'Authorization: Bearer USER_ACCESS_TOKEN' \
  -H 'Content-Type: application/json' \
  -d '{"projectId": "abc-123"}'
```

---

## Changelog

### Version 1.0.0 (Current)
- Initial API release
- Design validation endpoint
- Stress simulation endpoint
- AI analysis endpoint
- Report generation endpoint
- Complete database schema
- Authentication system

### Upcoming
- Batch validation endpoint
- Webhook support
- GraphQL API
- REST API versioning

---

## Support

For API support:
- Documentation: This file
- GitHub Issues: [Link to repo]
- Email: support@cadguard-ai.com

For Supabase-specific issues:
- Supabase Support: https://supabase.com/support
