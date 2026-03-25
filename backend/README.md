# CADGuard AI FastAPI Backend

Production-ready backend for CADGuard AI using FastAPI, trimesh, numpy/scipy, and Groq.

## Features

- FastAPI with modular clean architecture
- CAD geometry processing (STL/OBJ) via trimesh
- Geometry extraction: vertices, faces, bounding box, extents, volume, surface area
- Mesh quality checks: non-manifold edge detection, normal consistency, watertightness
- Wall thickness estimation
- Rule-based validation engine with severity and explanations
- Approximate stress simulation with weak-region detection
- Design quality scoring (0-100)
- Groq-powered issue explanation and improvement suggestions
- Unified JSON error handling
- CORS enabled for frontend integration

## Project Structure

backend/
- app/
  - api/routes.py
  - core/config.py
  - core/errors.py
  - core/logging.py
  - schemas/models.py
  - services/cad_service.py
  - services/validation_service.py
  - services/simulation_service.py
  - services/ai_service.py
  - main.py
- requirements.txt
- .env.example
- run.py

## Setup

1. Create and activate a Python virtual environment.
2. Install dependencies:

pip install -r requirements.txt

3. Copy environment template:

cp .env.example .env

4. Add your Groq key in .env:

GROQ_API_KEY=your_key

## Run

python run.py

Server starts at:

http://localhost:8000

Docs:

http://localhost:8000/docs

## API Endpoints

### GET /health
Returns service status and version.

### POST /validate
Upload a CAD file (STL or OBJ).

Returns:
- geometry stats
- validation issues
- quality score
- Groq AI explanation and suggestions

### POST /simulate
Upload a CAD file (STL or OBJ).

Returns:
- stress simulation metrics
- weak regions
- risk level
- digital twin summary
- Groq AI explanation and suggestions

## Example cURL

Validate:

curl -X POST "http://localhost:8000/validate" -F "file=@sample.stl"

Simulate:

curl -X POST "http://localhost:8000/simulate" -F "file=@sample.stl"
