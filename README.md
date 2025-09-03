# OSU Chemistry Articulation App

Flask-based web app to look up transfer course equivalencies for OSU Chemistry.

## Requirements
- Python 3.9+ (macOS has `python3`)

## Setup
Recommended: use a virtual environment
```bash
cd osu_articulation_state_filter
python3 -m venv .venv
source .venv/bin/activate  # macOS/Linux
python -m pip install -U pip
python -m pip install -r requirements.txt
```

If you are not using a virtual environment:
```bash
python3 -m pip install -r requirements.txt
```

## Run the app
Option A (direct Python):
```bash
APP_HOST=127.0.0.1 APP_PORT=5000 APP_DEBUG=0 python3 app.py
```

Run in background with basic logging:
```bash
APP_HOST=127.0.0.1 APP_PORT=5000 APP_DEBUG=0 python3 app.py \
  >/tmp/osu_articulation_server.log 2>&1 &
```

Option B (Flask CLI):
```bash
python3 -m flask --app app run
```

Option C (prod-like with Gunicorn):
```bash
APP_HOST=127.0.0.1 APP_PORT=5000 APP_DEBUG=false \
  gunicorn -w 2 -b 127.0.0.1:5000 app:app
```

Then open: `http://127.0.0.1:5000`

If you see “command not found: flask”, use the direct Python option or run the Flask CLI via module:
```bash
python3 -m flask --app app run
```

### Health check
Verify the app is running:
```bash
curl -sS http://127.0.0.1:5000/healthz
```


## Data files
All JSON data lives in `data/`:
- `states.json` – list of U.S. states
- `institutions.json` – institutions with `{ name, state }`
- `equivalencies.json` – transfer course mappings
- `osucourses.json` – OSU course metadata
- `pending_reviews.json` – populated when a user requests manual review

You can override the data directory via `DATA_DIR=/path/to/dir` for testing.

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

## Testing
```bash
pytest -q --cov=.
```

## Linting
```bash
ruff check .
```

## Frontend
- UI at `/` with state, institution, and course code search
- Uses Bootstrap 5
- Fonts: Open Sans (body) and Oswald (headings) via Google Fonts

## Troubleshooting
- Pip not found after activating venv: use `python -m pip ...` instead of `pip`.
- Using the venv’s pip explicitly: `./.venv/bin/python -m pip install -r requirements.txt`.
- Gunicorn not listening: ensure it’s installed in the same venv, or run via direct Python.
- Port already in use: close other processes using 5000 or run `python3 -m flask --app app run --port 5001`.
- Flask CLI not found: use `python3 -m flask` or `python3 app.py`.


