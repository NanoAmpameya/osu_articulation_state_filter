
import datetime
import json
import logging
import os
import time
import uuid
from collections import deque
from functools import wraps

from flask import Flask, g, jsonify, render_template, request

app = Flask(__name__)
BASE = os.path.dirname(__file__)
DATA_DIR = os.getenv("DATA_DIR", os.path.join(BASE, "data"))

def _env_bool(name, default=False):
    val = os.getenv(name)
    if val is None:
        return default
    return str(val).strip().lower() in ("1","true","yes","on","t")

APP_HOST = os.getenv("APP_HOST", "127.0.0.1")
APP_PORT = int(os.getenv("APP_PORT", "5000"))
APP_DEBUG = _env_bool("APP_DEBUG", False)
LOG_LEVEL = os.getenv("LOG_LEVEL", "INFO").upper()
logging.basicConfig(level=getattr(logging, LOG_LEVEL, logging.INFO))

def load(name):
    with open(os.path.join(DATA_DIR, name)) as f:
        return json.load(f)

STATES = load("states.json")
INSTITUTIONS = load("institutions.json")   # list of {name, state}
EQUIV = load("equivalencies.json")
DEGREES = load("degrees.json")
OSUCOURSES = load("osucourses.json")
META = { f"{c['subject_code']} {c['course_number']}": c for c in OSUCOURSES }
STATE_ABBREVIATIONS = { s.get("abbr", "").upper() for s in STATES }

def build_equivalency_index():
    """Create a fast lookup index for equivalencies keyed by (institution, course_code)."""
    index = {}
    for record in EQUIV:
        institution_key = (record.get("institution") or "").strip().lower()
        course_code_key = (record.get("course_code") or "").strip().lower()
        if institution_key and course_code_key:
            index[(institution_key, course_code_key)] = record
    return index

EQUIV_INDEX = build_equivalency_index()

# ---------------------------
# Logging and rate limiting
# ---------------------------

def get_client_ip():
    forwarded = request.headers.get("X-Forwarded-For")
    if forwarded:
        return forwarded.split(",")[0].strip()
    return request.remote_addr or "-"

@app.before_request
def _before_request_logging():
    g._start_time_s = time.time()
    g.request_id = request.headers.get("X-Request-ID") or uuid.uuid4().hex

@app.after_request
def _after_request_logging(response):
    try:
        duration_ms = int((time.time() - getattr(g, "_start_time_s", time.time())) * 1000)
        log_record = {
            "ts": datetime.datetime.utcnow().isoformat() + "Z",
            "level": "INFO",
            "rid": getattr(g, "request_id", "-"),
            "method": request.method,
            "path": request.path,
            "status": response.status_code,
            "duration_ms": duration_ms,
            "ip": get_client_ip(),
            "ua": request.headers.get("User-Agent", "")[:200],
        }
        logging.info(json.dumps(log_record))
        response.headers["X-Request-ID"] = getattr(g, "request_id", "-")
    except Exception:
        # Never block responses on logging errors
        pass
    return response

_RATE_BUCKETS = {}

def rate_limit(max_requests: int, window_seconds: int, scope: str):
    """Simple in-memory sliding-window limiter by client IP and scope."""
    def _decorator(fn):
        @wraps(fn)
        def _wrapper(*args, **kwargs):
            ip = get_client_ip()
            key = (scope, ip)
            bucket = _RATE_BUCKETS.setdefault(key, deque())
            now = time.time()
            # evict old
            while bucket and (now - bucket[0]) > window_seconds:
                bucket.popleft()
            if len(bucket) >= max_requests:
                retry_after = max(1, int(window_seconds - (now - bucket[0])))
                resp = jsonify({
                    "status": "rate_limited",
                    "message": "Too many requests. Please try again later.",
                    "scope": scope
                })
                resp.status_code = 429
                resp.headers["Retry-After"] = str(retry_after)
                return resp
            bucket.append(now)
            return fn(*args, **kwargs)
        return _wrapper
    return _decorator

@app.route("/")
def index():
    return render_template("index.html")

@app.route("/healthz")
def healthz():
    return jsonify({
        "status": "ok",
        "time": datetime.datetime.utcnow().isoformat() + "Z"
    })

@app.route("/apple-touch-icon.png")
@app.route("/apple-touch-icon-precomposed.png")
def apple_touch_icon():
    # Deliberately return no content to avoid 404 noise in logs
    return "", 204

@app.route("/api/states")
def api_states():
    return jsonify(STATES)

@app.route("/api/institutions")
def api_institutions():
    q = (request.args.get("q") or "").lower()
    st = (request.args.get("state") or "").upper()
    items = INSTITUTIONS[:]
    if st:
        items = [i for i in items if i.get("state","").upper()==st]
    if q:
        items = [i for i in items if q in i["name"].lower()]
    return jsonify([i["name"] for i in items][:50])

@app.route("/api/evaluate", methods=["POST"])
@rate_limit(max_requests=30, window_seconds=60, scope="evaluate")
def api_evaluate():
    payload = request.get_json(force=True)
    errors = {}
    institution_raw = (payload.get("institution") or "").strip()
    course_code_raw = (payload.get("course_code") or "").strip()
    degree = payload.get("degree")
    state_raw = (payload.get("state") or "").strip().upper()

    if not institution_raw:
        errors["institution"] = "Institution is required."
    if not course_code_raw:
        errors["course_code"] = "Course code is required."
    if not degree:
        errors["degree"] = "Degree is required."
    if state_raw and state_raw not in STATE_ABBREVIATIONS:
        errors["state"] = "State must be a valid two-letter abbreviation."

    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    inst = institution_raw.lower()
    code = course_code_raw.lower()

    match = EQUIV_INDEX.get((inst, code))
    if not match:
        return jsonify({
            "status": "no_match",
            "message": "Course not found in OSU Chemistry articulation database.",
        })

    meta = [META[k] for k in match.get("osu_equivalent", []) if k in META]
    return jsonify({
        "status": "ok",
        "result": match,
        "degree": DEGREES.get(degree, {}).get("name", degree),
        "course_meta": meta,
    })

@app.route("/api/request-review", methods=["POST"])
@rate_limit(max_requests=10, window_seconds=60, scope="request_review")
def api_request_review():
    payload = request.get_json(force=True)
    # Validate payload
    errors = {}
    institution_raw = (payload.get("institution") or "").strip()
    state_raw = (payload.get("state") or "").strip().upper()
    course_code_raw = (payload.get("course_code") or "").strip()
    degree = payload.get("degree")

    if not institution_raw:
        errors["institution"] = "Institution is required."
    if not state_raw:
        errors["state"] = "State is required."
    elif state_raw not in STATE_ABBREVIATIONS:
        errors["state"] = "State must be a valid two-letter abbreviation."
    if not course_code_raw:
        errors["course_code"] = "Course code is required."
    if not degree:
        errors["degree"] = "Degree is required."

    if errors:
        return jsonify({"status": "error", "errors": errors}), 400

    # Normalize and enrich the payload
    review_entry = {
        "institution": institution_raw,
        "state": state_raw,
        "course_code": course_code_raw,
        "degree": degree,
        "submitted_at": datetime.datetime.utcnow().isoformat() + "Z",
        "ip": request.headers.get("X-Forwarded-For", request.remote_addr),
    }

    dest_path = os.path.join(DATA_DIR, "pending_reviews.json")
    # Ensure file exists and is a JSON array
    if not os.path.exists(dest_path):
        with open(dest_path, "w") as f:
            json.dump([], f)
    try:
        with open(dest_path, "r") as f:
            queue = json.load(f)
            if not isinstance(queue, list):
                queue = []
    except Exception:
        queue = []

    queue.append(review_entry)
    with open(dest_path, "w") as f:
        json.dump(queue, f, indent=2)

    return jsonify({"status": "queued"})

if __name__ == "__main__":
    app.run(host=APP_HOST, port=APP_PORT, debug=APP_DEBUG)
    @app.route("/favicon.ico")
def favicon():
    return ("", 204)

