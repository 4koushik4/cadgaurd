# CADGuard AI - Intelligent Design Validation System

A production-ready AI-powered system for automated CAD design validation with digital twin stress simulation capabilities.

## Overview

CADGuard AI is a comprehensive design validation platform that combines rule-based engineering validation, AI-powered analysis, and digital twin simulation to help engineers detect design errors early and improve design quality.

## Key Features

### 1. CAD Model Upload & Processing
- Support for STL, STEP, and OBJ file formats
- Automatic geometry feature extraction (dimensions, faces, edges, holes, thickness heuristics)
- Secure file storage with Supabase Storage

### 2. Rule-Based Validation Engine
The system implements deterministic engineering rules:

- **Minimum Wall Thickness**: Ensures structural integrity
- **Hole Alignment and Spacing Validation**: Prevents stress concentration and assembly mismatch
- **Clearance and Interference Detection**: Detects overlap and insufficient fit tolerance
- **Structural Integrity Heuristic**: Detects low structural margin conditions
- **Manufacturability (DFM) Check**: Scores production complexity
- **Minimum Fillet Radius**: Validates manufacturability
- **Draft Angle Check**: Ensures proper mold release

### 3. Digital Twin Stress Simulation
- Finite element analysis simulation
- Multiple material support (Aluminum, Steel, Titanium)
- Stress distribution calculation
- Safety factor analysis
- Failure point prediction with modes
- Visual stress heat maps

### 4. Multi-Agent AI System
Three specialized AI agents work together:

- **Validator Agent**: Runs deterministic engineering rules
- **Explainer Agent**: Generates natural language explanations
- **Optimizer Agent**: Provides actionable fix suggestions

### 5. Intelligent Reporting
- Real-time validation results
- AI-generated explanations and suggestions
- Severity-based issue categorization
- Visual 3D model viewer with issue highlights and section view
- JSON web reports and downloadable PDF reports

### 6. Self-Learning System
- Stores design patterns and corrections
- Improves suggestions over time
- Tracks success rates of fixes
- Pattern recognition for common issues

### 7. Design Quality Scoring
- 0-100 quality score based on detected issues
- Weighted by severity (Critical: -20, Warning: -10, Info: -5)
- Dashboard analytics and trends

## Tech Stack

### Frontend
- React 18 with TypeScript
- Tailwind CSS for styling
- Three.js for 3D visualization
- Vite for build tooling
- Lucide React for icons

### Backend
- Supabase (PostgreSQL database)
- Supabase Edge Functions (Deno runtime)
- Row Level Security (RLS) for data protection

### AI Integration
- OpenAI API for intelligent analysis
- Fallback explanations for offline mode
- Multi-agent architecture

### File Processing
- Support for multiple CAD formats
- Geometry metadata extraction
- Secure storage with access control

## Architecture

### Database Schema

#### Projects Table
Stores uploaded CAD projects with metadata and quality scores.

#### Validations Table
Tracks validation runs with issue counts and execution time.

#### Issues Table
Individual detected issues with AI explanations and suggestions.

#### Simulation Results Table
Digital twin simulation data including stress, displacement, and failure predictions.

#### Design History Table
Self-learning pattern storage for improved suggestions.

#### Reports Table
Generated validation and simulation reports.

### Edge Functions

#### validate-design
- Runs all validation rules on a project
- Calculates quality score
- Triggers AI analysis
- Returns comprehensive validation results

#### run-simulation
- Performs digital twin stress analysis
- Calculates maximum stress and displacement
- Determines safety factor
- Predicts failure points and modes

#### ai-analysis
- Generates AI explanations for issues
- Provides actionable fix suggestions
- Updates design history for learning
- Supports both AI and fallback modes

#### generate-report
- Generates combined validation and simulation reports
- Supports `web` (JSON) and `pdf` formats
- Stores reports in Supabase Storage and metadata in DB

## Getting Started

### Prerequisites
- Node.js 18+
- Supabase account
- OpenAI API key (optional, has fallback)

### Installation

1. Clone the repository
2. Install dependencies:
```bash
npm install
```

3. Configure environment variables in `.env`:
```env
VITE_SUPABASE_URL=your_supabase_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
```

4. Apply migrations and deploy functions:
```bash
supabase link --project-ref <your-project-ref>
supabase db push
supabase functions deploy validate-design
supabase functions deploy run-simulation
supabase functions deploy ai-analysis
supabase functions deploy generate-report
```

5. Set function secrets:
```bash
supabase secrets set OPENAI_API_KEY=<your_openai_api_key>
```

6. Start development server:
```bash
npm run dev
```

### Building for Production

```bash
npm run build
```

## Usage

### 1. Upload CAD Model
- Click "Upload CAD Model"
- Select STL, STEP, or OBJ file
- Provide project name and description
- Upload to cloud storage

### 2. Run Validation
- Select a project from the dashboard
- Click "Run Validation"
- View detected issues with severity levels
- Read AI explanations and suggestions

### 3. Run Stress Simulation
- Click "Run Simulation"
- Review stress and displacement results
- Check safety factor
- Identify predicted failure points
- View stress visualization

### 4. Analyze Results
- Filter issues by severity
- Review AI-generated explanations
- Follow suggested fixes
- Track design quality score

## API Endpoints

### POST /functions/v1/validate-design
Runs comprehensive validation on a project.

**Request:**
```json
{
  "projectId": "uuid"
}
```

**Response:**
```json
{
  "success": true,
  "validationId": "uuid",
  "totalIssues": 5,
  "qualityScore": 75
}
```

### POST /functions/v1/run-simulation
Performs digital twin stress simulation.

**Request:**
```json
{
  "projectId": "uuid",
  "materialType": "aluminum_6061",
  "force": 1000
}
```

**Response:**
```json
{
  "success": true,
  "simulationId": "uuid",
  "passed": true,
  "maxStress": 150.5,
  "safetyFactor": 2.3,
  "failurePoints": 0
}
```

### POST /functions/v1/ai-analysis
Generates AI explanations and suggestions for issues.

**Request:**
```json
{
  "validationId": "uuid",
  "useAI": true
}
```

### POST /functions/v1/generate-report
Generates web/PDF report for a project and stores it in Supabase.

**Request:**
```json
{
  "projectId": "uuid",
  "format": "pdf"
}
```

**Response:**
```json
{
  "success": true,
  "processedIssues": 5,
  "aiEnabled": true
}
```

## Security

- Row Level Security (RLS) enabled on all tables
- Users can only access their own projects
- JWT authentication required for all operations
- Secure file storage with access controls
- No data leakage between users

## Validation Rules

### Structural Rules
1. **Minimum Wall Thickness**: ≥ 2mm
2. **Aspect Ratio**: ≤ 10:1

### Manufacturing Rules
3. **Sharp Corners**: Detection and warning
4. **Minimum Fillet Radius**: ≥ 1mm
5. **Draft Angle**: ≥ 2 degrees
6. **Undercuts**: Detection and complexity warning

### Dimensional Rules
7. **Hole Spacing**: ≥ 5mm edge-to-edge

## Simulation Parameters

### Material Properties
- **Aluminum 6061-T6**: E=68.9 GPa, Yield=276 MPa
- **Steel 1045**: E=200 GPa, Yield=530 MPa
- **Titanium Ti-6Al-4V**: E=113.8 GPa, Yield=880 MPa

### Load Conditions
- Vertical force application
- Fixed support boundary conditions
- Stress concentration factor analysis

### Safety Criteria
- Minimum safety factor: 1.5
- Stress must be below yield strength
- Displacement within acceptable limits

## Future Enhancements

- PDF report generation
- CAD file format parsing (actual geometry extraction)
- Advanced FEA integration
- Multi-load case simulation
- Design optimization suggestions
- Collaboration features
- Version control for designs
- Integration with CAD software plugins

## License

MIT License - See LICENSE file for details

## Support

For issues and questions, please contact support or open an issue in the repository.
