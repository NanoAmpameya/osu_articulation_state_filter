// Utilities
function cx(...classes) {
  return classes.filter(Boolean).join(" ");
}

// New UI: Sticky Header and Resource Center
const { useEffect, useState } = React;

function HeaderNav() {
  return (
    <header id="top-nav" className="sticky top-0 z-30 bg-white border-b shadow-sm" style={{ borderColor: 'var(--primary)' }}>
      <div className="max-w-6xl mx-auto px-3 md:px-6 py-2 flex items-center justify-between">
        <div className="flex items-center gap-2 font-extrabold select-none text-[var(--primary)]">
          <span>Chemistry Articulation</span>
        </div>
        <nav className="flex items-center gap-2 md:gap-3">
          <button data-testid="nav-login" className="rounded-xl px-3 md:px-4 py-2 font-semibold bg-white text-[var(--primary)] hover:bg-gray-50 border" style={{ borderColor: 'var(--primary)' }}>
            Log in
          </button>
        </nav>
      </div>
    </header>
  );
}

function ArrowCard({ id, icon, label, onClick }) {
  return (
    <div
      role="button"
      tabIndex={0}
      data-testid={id}
      onClick={onClick}
      onKeyDown={(e)=> {
        if ((e.key==='Enter'||e.key===' ') && typeof onClick === 'function') {
          onClick();
        }
      }}
      className="arrow-card cursor-pointer"
      aria-label={label}
    >
      <div className="flex items-center gap-3 text-xl md:text-2xl font-extrabold">
        <span>{label}</span>
      </div>
    </div>
  );
}

function ResourceCenter() {
  const itemsLeft = [
    { id: 'rc-transfer-guides', icon: '↔️', label: 'Transfer Guides' },
    { id: 'rc-howto-videos', icon: '🎥', label: 'How-To Videos' },
    { id: 'rc-student-support', icon: 'ℹ️', label: 'Student Support Services' },
  ];
  const itemsRight = [
    { id: 'rc-academic-planning', icon: '🎓', label: 'Academic Planning' },
    { id: 'rc-transfer-planning', icon: '📝', label: 'Transfer Planning' },
    { id: 'rc-financial-planning', icon: '💲', label: 'Financial Planning' },
  ];
  return (
    <section id="resource-center" className="rounded-2xl p-5 md:p-8 border bg-white" style={{ borderColor: 'var(--primary)' }}>
      <h2 className="text-3xl md:text-4xl font-extrabold text-center text-[var(--beaver)]">Resource Center</h2>
      <p className="mt-2 text-center text-lg text-[var(--beaver)]">
        There are guides, checklists, and printables that will help you on every step of your transfer journey.
      </p>
      <div className="mt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="space-y-4">
          {itemsLeft.map(x => <ArrowCard key={x.id} {...x} />)}
        </div>
        <div className="space-y-4">
          {itemsRight.map(x => <ArrowCard key={x.id} {...x} />)}
        </div>
      </div>
    </section>
  );
}

// Components
function StateSelect({ states, value, onChange, loading, error }) {
  return (
    <div className="mb-4">
      <label htmlFor="state-select" className="block text-sm font-medium text-gray-700 mb-1">State</label>
      <select
        id="state-select"
        className={cx(
          "block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300",
          loading && "opacity-60"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        aria-invalid={!!error}
      >
        <option value="">Select a state</option>
        {states.map((s) => (
          <option key={s.abbr} value={s.abbr}>{`${s.name} (${s.abbr})`}</option>
        ))}
      </select>
      {loading && <p className="text-xs text-gray-500 mt-1">Loading...</p>}
      {error && <p className="text-sm text-red-600 mt-1" id="error-box">{error}</p>}
    </div>
  );
}

function InstitutionSelect({ institutions, value, onChange, disabled, loading, error }) {
  return (
    <div className="mb-4">
      <label htmlFor="institution-select" className="block text-sm font-medium text-gray-700 mb-1">Institution</label>
      <select
        id="institution-select"
        className={cx(
          "block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300",
          disabled && "bg-gray-100 cursor-not-allowed",
          loading && "opacity-60"
        )}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        aria-invalid={!!error}
      >
        <option value="">{disabled ? "Choose a state first" : "Select an institution"}</option>
        {institutions.map((inst) => (
          <option key={inst.value} value={inst.value}>{inst.label}</option>
        ))}
      </select>
      {loading && <p className="text-xs text-gray-500 mt-1">Loading...</p>}
      {error && <p className="text-sm text-red-600 mt-1" id="error-box">{error}</p>}
    </div>
  );
}

function ResultCard({ result }) {
  if (!result) return null;
  if (result.status === "loading") {
    return (
      <div id="result-card" data-status="loading" className="rounded-xl shadow p-4 bg-white">
        <p className="text-sm text-gray-600">Loading...</p>
      </div>
    );
  }
  if (result.status === "ok") {
    const match = result.result || {};
    const equivalents = Array.isArray(match.osu_equivalent) ? match.osu_equivalent : [];
    return (
      <div id="result-card" data-status="ok" className="rounded-xl shadow p-4 bg-white">
        <h3 className="text-lg font-semibold mb-2">Match found</h3>
        <p className="text-gray-700 mb-2">
          OSU Course: {equivalents.length ? equivalents.join(", ") : "—"}
          {" "}— Credits: {match.credits ?? "—"} — Confidence: 100%
        </p>
        {match.notes && <p className="text-sm text-gray-600">{match.notes}</p>}
      </div>
    );
  }
  if (result.status === "no_match") {
    const suggestions = Array.isArray(result.suggestions) ? result.suggestions.slice(0, 3) : [];
    return (
      <div id="result-card" data-status="no_match" className="rounded-xl shadow p-4 bg-white">
        <h3 className="text-lg font-semibold mb-2">No direct match</h3>
        {suggestions.length > 0 ? (
          <div>
            <p className="text-gray-700 mb-2">Try one of these:</p>
            <ul className="list-disc pl-6 text-gray-700">
              {suggestions.map((s) => (
                <li key={s}>{s}</li>
              ))}
            </ul>
          </div>
        ) : (
          <p className="text-gray-700">No suggestions available.</p>
        )}
      </div>
    );
  }
  if (result.status === "error") {
    return (
      <div id="result-card" data-status="error" className="rounded-xl shadow p-4 bg-white">
        <p className="text-red-600">Something went wrong. Please try again.</p>
      </div>
    );
  }
  return null;
}

function CourseEvaluate({ fromInstitutionId, onEvaluateResult, setLoading, setError }) {
  const [fromCourse, setFromCourse] = React.useState("");
  const canSubmit = Boolean(fromInstitutionId && fromCourse.trim());

  async function handleSubmit(e) {
    e.preventDefault();
    if (!canSubmit) return;
    setError("");
    setLoading(true);
    onEvaluateResult({ status: "loading" });
    try {
      // Parse fromInstitutionId: `${state}::${institutionName}`
      const [st, instName] = (fromInstitutionId || "::").split("::");
      const payload = {
        institution: instName || "",
        state: (st || "").toUpperCase(),
        course_code: fromCourse.trim(),
        degree: "BA_Chem",
      };
      const res = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) {
        // 4xx errors
        onEvaluateResult({ status: "error" });
        const msg = data?.errors ? JSON.stringify(data.errors) : data?.message || "Invalid request";
        setError(msg);
      } else {
        onEvaluateResult(data);
      }
    } catch (err) {
      onEvaluateResult({ status: "error" });
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
      <div className="md:col-span-2">
        <label htmlFor="course-input" className="block text-sm font-medium text-gray-700 mb-1">Course code</label>
        <input
          id="course-input"
          className="block w-full rounded-md border border-gray-300 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-orange-300"
          placeholder="e.g., CHE 107LR, CHEM 1610"
          value={fromCourse}
          onChange={(e) => setFromCourse(e.target.value)}
        />
      </div>
      <div>
        <button
          id="evaluate-btn"
          type="submit"
          disabled={!canSubmit}
          className={cx(
            "rounded border px-4 py-2 font-medium",
            canSubmit ? "hover:bg-gray-50" : "opacity-60 cursor-not-allowed"
          )}
        >
          Evaluate
        </button>
      </div>
    </form>
  );
}

// EvaluateFlow: preserves existing Step 5 controls and IDs
function EvaluateFlow() {
  const [states, setStates] = React.useState([]);
  const [stateVal, setStateVal] = React.useState("");
  const [institutions, setInstitutions] = React.useState([]);
  const [instVal, setInstVal] = React.useState("");
  const [loadingStates, setLoadingStates] = React.useState(false);
  const [loadingInst, setLoadingInst] = React.useState(false);
  const [loadingEval, setLoadingEval] = React.useState(false);
  const [error, setError] = React.useState("");
  const [result, setResult] = React.useState(null);

  // Load states on mount
  React.useEffect(() => {
    let active = true;
    setLoadingStates(true);
    fetch("/api/states")
      .then((r) => r.json())
      .then((data) => {
        if (!active) return;
        setStates(data.sort((a, b) => a.name.localeCompare(b.name)));
      })
      .catch(() => setError("Something went wrong. Please try again."))
      .finally(() => setLoadingStates(false));
    return () => { active = false; };
  }, []);

  // Load institutions when state changes
  React.useEffect(() => {
    setInstitutions([]);
    setInstVal("");
    if (!stateVal) return;
    setLoadingInst(true);
    fetch(`/api/institutions?state=${encodeURIComponent(stateVal)}`)
      .then((r) => r.json())
      .then((list) => {
        setInstitutions(list.map((name) => ({ label: name, value: `${stateVal}::${name}` })));
      })
      .catch(() => setError("Something went wrong. Please try again."))
      .finally(() => setLoadingInst(false));
  }, [stateVal]);

  return (
    <div id="evaluate-flow">
      {error && (
        <div id="error-box" className="rounded border border-red-300 bg-red-50 text-red-700 p-3 mb-4">
          {error}
        </div>
      )}

      <StateSelect
        states={states}
        value={stateVal}
        onChange={(v) => { setError(""); setStateVal(v); setResult(null); }}
        loading={loadingStates}
      />

      <InstitutionSelect
        institutions={institutions}
        value={instVal}
        onChange={(v) => { setError(""); setInstVal(v); setResult(null); }}
        disabled={!stateVal}
        loading={loadingInst}
      />

      {instVal && (
        <CourseEvaluate
          fromInstitutionId={instVal}
          onEvaluateResult={setResult}
          setLoading={setLoadingEval}
          setError={setError}
        />
      )}

      {result && (
        <div className="mt-6">
          <ResultCard result={result} />
        </div>
      )}
    </div>
  );
}

function App() {
  return (
    <div className="min-h-screen bg-white">
      <HeaderNav />
      <main className="max-w-5xl mx-auto p-4 md:p-6 space-y-8">
        <section className="bg-white rounded-2xl border border-slate-200 p-5">
          <h2 className="text-xl md:text-2xl font-bold mb-3">Check Equivalency</h2>
          <p className="text-slate-700 mb-3">
            For a given transcript from an arbitrary institution, find the corresponding
            courses at OSU for credit transfer in the chemistry database.
          </p>
          <EvaluateFlow />
        </section>

        <ResourceCenter />

      </main>
      <footer className="mt-10 py-6 text-center text-sm text-slate-500">© {new Date().getFullYear()} OSU Transfer Tools</footer>
    </div>
  );
}

// Expose App for testing
window.App = App;

const root = ReactDOM.createRoot(document.getElementById("root"));
root.render(<App />);
