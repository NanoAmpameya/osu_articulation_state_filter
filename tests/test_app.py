import json
import os
import sys
import tempfile

CURRENT_DIR = os.path.dirname(__file__)
PROJECT_ROOT = os.path.abspath(os.path.join(CURRENT_DIR, os.pardir))
if PROJECT_ROOT not in sys.path:
    sys.path.insert(0, PROJECT_ROOT)

import app as app_module  # noqa: E402


def make_client(tmpdir):
    os.environ["DATA_DIR"] = tmpdir
    # Re-import data by reloading module-level data
    # In a bigger app we'd refactor, but for tests, rebuild the index and constants
    app_module.STATES = app_module.load("states.json")
    app_module.INSTITUTIONS = app_module.load("institutions.json")
    app_module.EQUIV = app_module.load("equivalencies.json")
    app_module.DEGREES = app_module.load("degrees.json")
    app_module.OSUCOURSES = app_module.load("osucourses.json")
    app_module.META = {
        f"{c['subject_code']} {c['course_number']}": c for c in app_module.OSUCOURSES
    }
    app_module.STATE_ABBREVIATIONS = {s.get("abbr", "").upper() for s in app_module.STATES}
    app_module.EQUIV_INDEX = app_module.build_equivalency_index()
    return app_module.app.test_client()


def test_healthz():
    client = app_module.app.test_client()
    r = client.get("/healthz")
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "ok"


def test_states():
    client = app_module.app.test_client()
    r = client.get("/api/states")
    assert r.status_code == 200
    data = r.get_json()
    assert isinstance(data, list)
    assert any(s.get("abbr") == "OR" for s in data)


def test_evaluate_validation():
    client = app_module.app.test_client()
    r = client.post("/api/evaluate", json={})
    assert r.status_code == 400
    data = r.get_json()
    assert data["status"] == "error"
    assert "institution" in data["errors"]


def test_evaluate_success():
    client = app_module.app.test_client()
    payload = {
        "institution": "Binghamton University (SUNY)",
        "course_code": "CHEM 107",
        "degree": "BA_Chem",
        "state": "NY",
    }
    r = client.post("/api/evaluate", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "ok"
    assert data["degree"].startswith("B.")


def test_request_review_validation():
    # Use temp data dir for pending_reviews writes
    tmpdir = tempfile.mkdtemp()
    # copy data files to temp dir
    src = os.path.join(app_module.BASE, "data")
    for fname in os.listdir(src):
        with open(os.path.join(src, fname), "rb") as fsrc, open(
            os.path.join(tmpdir, fname), "wb"
        ) as fdst:
            fdst.write(fsrc.read())

    client = make_client(tmpdir)
    r = client.post(
        
        "/api/request-review",
        json={"institution": "", "state": "XX", "course_code": "", "degree": ""},
    )
    assert r.status_code == 400
    data = r.get_json()
    assert data["status"] == "error"


def test_request_review_success():
    tmpdir = tempfile.mkdtemp()
    src = os.path.join(app_module.BASE, "data")
    for fname in os.listdir(src):
        with open(os.path.join(src, fname), "rb") as fsrc, open(
            os.path.join(tmpdir, fname), "wb"
        ) as fdst:
            fdst.write(fsrc.read())

    client = make_client(tmpdir)
    payload = {
        "institution": "Binghamton University (SUNY)",
        "course_code": "CHEM 107",
        "degree": "BA_Chem",
        "state": "NY",
    }
    r = client.post("/api/request-review", json=payload)
    assert r.status_code == 200
    data = r.get_json()
    assert data["status"] == "queued"
    # ensure file written in tmpdir
    with open(os.path.join(tmpdir, "pending_reviews.json")) as f:
        arr = json.load(f)
    assert isinstance(arr, list) and len(arr) >= 1


