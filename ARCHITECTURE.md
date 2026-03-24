# CADGuard AI - System Architecture

## System Overview

CADGuard AI is built on a modern, scalable architecture using React for the frontend, Supabase for the backend, and AI-powered analysis through OpenAI integration.

## Architecture Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│                          Frontend (React)                        │
│  ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────┐       │
│  │   Auth   │  │Dashboard │  │ 3D Viewer│  │Validation│       │
│  │Component │  │ Component│  │(Three.js)│  │  Results │       │
│  └──────────┘  └──────────┘  └──────────┘  └──────────┘       │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                    Supabase Backend Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │ Auth Service │  │   Database   │  │Storage Bucket│         │
│  │     (JWT)    │  │ (PostgreSQL) │  │  (CAD Files) │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                  Supabase Edge Functions (Deno)                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  validate-   │  │run-simulation│  │ ai-analysis  │         │
│  │   design     │  │              │  │              │         │
│  └──────────────┘  └──────────────┘  └──────────────┘         │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  ┌──────────────┐                                               │
│  │  OpenAI API  │  (Optional - has fallback)                   │
│  └──────────────┘                                               │
└─────────────────────────────────────────────────────────────────┘
```

## Component Architecture

### Frontend Layer

#### 1. Authentication Context
- **Location**: `src/contexts/AuthContext.tsx`
- **Purpose**: Manages user authentication state
- **Features**:
  - Sign up / Sign in / Sign out
  - Session management
  - Auth state listeners
  - User profile access

#### 2. Main Components

##### Auth Component
- **Location**: `src/components/Auth.tsx`
- **Purpose**: Login and registration UI
- **Features**: Email/password authentication, error handling

##### Dashboard Component
- **Location**: `src/components/Dashboard.tsx`
- **Purpose**: Main application interface
- **Features**: Project overview, statistics, navigation

##### ProjectList Component
- **Location**: `src/components/ProjectList.tsx`
- **Purpose**: Display all user projects
- **Features**: Project cards, status indicators, quality scores

##### ProjectUpload Component
- **Location**: `src/components/ProjectUpload.tsx`
- **Purpose**: CAD file upload interface
- **Features**: File selection, validation, upload to storage

##### ProjectDetails Component
- **Location**: `src/components/ProjectDetails.tsx`
- **Purpose**: Detailed project view with tabs
- **Features**: Overview, validation, simulation, 3D viewer tabs

##### ValidationResults Component
- **Location**: `src/components/ValidationResults.tsx`
- **Purpose**: Display validation issues
- **Features**: Severity filtering, AI explanations, issue details

##### SimulationView Component
- **Location**: `src/components/SimulationView.tsx`
- **Purpose**: Display simulation results
- **Features**: Stress/displacement data, failure predictions, material info

##### CADViewer Component
- **Location**: `src/components/CADViewer.tsx`
- **Purpose**: 3D model visualization
- **Features**: Three.js rendering, camera controls, model rotation

### Backend Layer

#### Database Schema

##### Tables

1. **projects**
   - Stores CAD project information
   - Fields: id, user_id, name, description, file_format, file_url, quality_score, status, metadata
   - RLS: Users can only access their own projects

2. **validations**
   - Stores validation run results
   - Fields: id, project_id, validation_type, status, issue counts, execution_time
   - RLS: Access through project ownership

3. **issues**
   - Individual detected issues
   - Fields: id, validation_id, project_id, rule_id, severity, category, title, description, values, AI fields
   - RLS: Access through project ownership

4. **simulation_results**
   - Digital twin simulation data
   - Fields: id, project_id, simulation_type, load_conditions, material_properties, stress, displacement, safety_factor, failure_prediction
   - RLS: Access through project ownership

5. **design_history**
   - Self-learning pattern storage
   - Fields: id, user_id, issue_pattern, fix_applied, success_rate, usage_count, category
   - RLS: Users can only access their own history

6. **reports**
   - Generated reports
   - Fields: id, project_id, validation_id, report_type, format, file_url, content
   - RLS: Access through project ownership

### Edge Functions Architecture

#### 1. validate-design Function
**Location**: `supabase/functions/validate-design/index.ts`

**Flow**:
1. Receive project ID
2. Fetch project from database
3. Update status to "processing"
4. Create validation record
5. Run all validation rules
6. Categorize issues by severity
7. Save issues to database
8. Calculate quality score
9. Update validation status
10. Trigger AI analysis asynchronously
11. Return results

**Validation Rules**:
- MIN_WALL_THICKNESS: Checks for structural integrity
- HOLE_SPACING: Validates dimensional constraints
- SHARP_CORNERS: Detects manufacturing issues
- MINIMUM_RADIUS: Checks fillet radii
- DRAFT_ANGLE: Validates mold release angles
- UNDERCUTS: Detects complex tooling needs
- ASPECT_RATIO: Checks for deflection risks

**Quality Score Calculation**:
```
score = 100 - (critical * 20 + warnings * 10 + info * 5)
score = max(0, score)
```

#### 2. run-simulation Function
**Location**: `supabase/functions/run-simulation/index.ts`

**Flow**:
1. Receive project ID and parameters
2. Fetch project from database
3. Select material properties
4. Define load conditions
5. Extract/generate geometry data
6. Perform stress simulation
7. Calculate max stress and displacement
8. Determine safety factor
9. Predict failure points
10. Generate visualization data
11. Save results to database
12. Return summary

**Simulation Algorithm**:
```
nominal_stress = force / area
max_stress = nominal_stress * stress_concentration_factor
max_displacement = (F * L³) / (3 * E * I)
safety_factor = yield_strength / max_stress
```

**Material Database**:
- Aluminum 6061-T6
- Carbon Steel 1045
- Titanium Ti-6Al-4V

**Failure Modes**:
- Yielding (exceeds elastic limit)
- Stress concentration (sharp corners)
- Buckling (thin sections)

#### 3. ai-analysis Function
**Location**: `supabase/functions/ai-analysis/index.ts`

**Flow**:
1. Receive validation ID
2. Fetch all issues for validation
3. For each issue:
   - Generate explanation prompt
   - Generate suggestion prompt
   - Call OpenAI API (if enabled)
   - Use fallback if API fails
   - Update issue with AI fields
4. Update design history
5. Return processing summary

**Multi-Agent Architecture**:
- **Validator Agent**: (in validate-design) Runs deterministic rules
- **Explainer Agent**: (in ai-analysis) Generates explanations
- **Optimizer Agent**: (in ai-analysis) Provides fix suggestions

**Fallback System**:
- Predefined explanations for common issues
- Rule-based suggestions
- Works offline without AI API

## Data Flow

### Project Upload Flow
```
User → Upload Component → Supabase Storage → Database (projects table)
```

### Validation Flow
```
User → Dashboard → validate-design Edge Function
  → Database (validations, issues)
  → ai-analysis Edge Function
  → Database (updated issues with AI)
  → Frontend (results display)
```

### Simulation Flow
```
User → Dashboard → run-simulation Edge Function
  → Physics Calculations
  → Database (simulation_results)
  → Frontend (results display)
```

## Security Architecture

### Authentication
- JWT-based authentication via Supabase Auth
- Session management with automatic refresh
- Secure password hashing

### Authorization
- Row Level Security (RLS) on all tables
- User can only access own data
- Service role key for Edge Functions

### Data Protection
- All API calls require authentication
- CORS headers properly configured
- No sensitive data in client-side code
- Secure file storage with access controls

## Scalability Considerations

### Database
- Indexed foreign keys for fast joins
- Composite indexes on frequently queried columns
- Connection pooling via Supabase

### Edge Functions
- Serverless architecture (auto-scaling)
- Async AI analysis (non-blocking)
- Stateless design for horizontal scaling

### Frontend
- Code splitting via Vite
- Lazy loading for components
- Optimized bundle size

## Performance Optimizations

### Frontend
- React.memo for expensive components
- Efficient state management
- Debounced API calls
- Optimized re-renders

### Backend
- Batch inserts for issues
- Single query for project data
- Async AI processing
- Database indexes

### 3D Rendering
- WebGL acceleration via Three.js
- Efficient geometry updates
- Camera controls optimization
- RequestAnimationFrame for smooth rendering

## Monitoring & Error Handling

### Frontend
- Try-catch blocks for async operations
- User-friendly error messages
- Loading states for better UX
- Console logging for debugging

### Backend
- Error logging in Edge Functions
- Graceful degradation (AI fallback)
- Transaction-like operations
- Status tracking in database

## Development Workflow

### Local Development
1. Install dependencies: `npm install`
2. Configure `.env` file
3. Run dev server: `npm run dev`
4. Test Edge Functions locally

### Deployment
1. Build frontend: `npm run build`
2. Deploy Edge Functions via Supabase
3. Update environment variables
4. Run migrations if needed

## Technology Choices Rationale

### React
- Component-based architecture
- Strong TypeScript support
- Large ecosystem
- Excellent developer experience

### Supabase
- PostgreSQL database (ACID compliance)
- Built-in authentication
- Row Level Security
- Edge Functions (serverless)
- File storage
- Real-time capabilities (future use)

### Three.js
- Industry-standard 3D library
- WebGL acceleration
- Extensive documentation
- Active community

### TypeScript
- Type safety
- Better IDE support
- Fewer runtime errors
- Self-documenting code

### Tailwind CSS
- Utility-first approach
- Consistent design system
- Small bundle size
- Easy to customize

## Future Architecture Enhancements

### Planned Features
1. **Real-time Collaboration**: Using Supabase Realtime
2. **Microservices**: Separate services for different simulation types
3. **Caching Layer**: Redis for frequently accessed data
4. **CDN Integration**: For faster asset delivery
5. **Background Jobs**: For long-running simulations
6. **Webhooks**: For integration with external tools
7. **API Gateway**: For rate limiting and monitoring
8. **Event Sourcing**: For audit trails and versioning

### Scalability Roadmap
1. Database sharding for large-scale users
2. Read replicas for analytics
3. Multi-region deployment
4. CDN for global performance
5. Kubernetes for Edge Functions (if needed)
