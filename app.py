
import os, json, datetime
from flask import Flask, request, jsonify, render_template

app = Flask(__name__)
BASE = os.path.dirname(__file__)

def load(name):
    with open(os.path.join(BASE, "data", name)) as f:
        return json.load(f)

STATES = load("states.json")
INSTITUTIONS = load("institutions.json")   # list of {name, state}
EQUIV = load("equivalencies.json")
DEGREES = load("degrees.json")
OSUCOURSES = load("osucourses.json")
META = { f"{c['subject_code']} {c['course_number']}": c for c in OSUCOURSES }

@app.route("/")
def index():
    return render_template("index.html")

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
def api_evaluate():
    payload = request.get_json(force=True)
    inst = (payload.get("institution") or "").strip().lower()
    code = (payload.get("course_code") or "").strip().lower()
    degree = payload.get("degree")
    # Accept state to match requested contract, even if not strictly needed to find a match
    _state = (payload.get("state") or "").strip().upper()

    match = next((x for x in EQUIV if x["institution"].lower()==inst and x["course_code"].lower()==code), None)
    if not match:
        return jsonify({"status":"no_match","message":"Course not found in OSU Chemistry articulation database."})

    meta = [META[k] for k in match.get("osu_equivalent", []) if k in META]
    return jsonify({"status":"ok","result":match,"degree":DEGREES.get(degree,{}).get("name",degree),"course_meta":meta})

@app.route("/api/request-review", methods=["POST"])
def api_request_review():
    payload = request.get_json(force=True)
    # Normalize and enrich the payload
    review_entry = {
        "institution": (payload.get("institution") or "").strip(),
        "state": (payload.get("state") or "").strip().upper(),
        "course_code": (payload.get("course_code") or "").strip(),
        "degree": payload.get("degree"),
        "submitted_at": datetime.datetime.utcnow().isoformat() + "Z",
        "ip": request.headers.get("X-Forwarded-For", request.remote_addr),
    }

    dest_path = os.path.join(BASE, "data", "pending_reviews.json")
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
    app.run(debug=True)
