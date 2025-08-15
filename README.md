# OSU Chemistry Articulation App

Flask-based web app to look up transfer course equivalencies for OSU Chemistry.

## Requirements
- Python 3.9+ (macOS has `python3`)

## Setup
```bash
cd osu_articulation_state_filter
python3 -m pip install -r requirements.txt
```

Optional (recommended): create and activate a virtual environment
```bash
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
python3 -m pip install -r requirements.txt
```

## Run the app
Option A (Flask CLI):
```bash
python3 -m flask --app app run
```

Option B (direct Python):
```bash
python3 app.py
```

Then open: `http://127.0.0.1:5000`

If you see “command not found: flask”, use the direct Python option or run the Flask CLI via module:
```bash
python3 -m flask --app app run
```

## Data files
All JSON data lives in `data/`:
- `states.json` – list of U.S. states
- `institutions.json` – institutions with `{ name, state }`
- `equivalencies.json` – transfer course mappings
- `osucourses.json` – OSU course metadata
- `pending_reviews.json` – populated when a user requests manual review

## API endpoints
- `GET /api/states` → list of states
- `GET /api/institutions?state=XX&q=...` → institutions for a state, optional search
- `POST /api/evaluate` (JSON: `{ institution, state, course_code, degree }`) → evaluation result
- `POST /api/request-review` (same payload) → appends to `data/pending_reviews.json`

### Quick test
```bash
curl http://127.0.0.1:5000/api/states
curl "http://127.0.0.1:5000/api/institutions?state=NY&q=university"
curl -X POST http://127.0.0.1:5000/api/evaluate \
  -H 'Content-Type: application/json' \
  -d '{"institution":"University at Buffalo (SUNY)","state":"NY","course_code":"CHE 107LR","degree":"BS_Chem"}'
```

## Frontend
- UI at `/` with state, institution, and course code search
- Uses Bootstrap 5
- Fonts: Open Sans (body) and Oswald (headings) via Google Fonts

## Troubleshooting
- Port already in use: close other processes using 5000 or run `python3 -m flask --app app run --port 5001`
- Flask CLI not found: use `python3 -m flask` or `python3 app.py`


