function useStates() {
  const [states, setStates] = React.useState([]);
  React.useEffect(() => {
    fetch('/api/states').then(r => r.json()).then((s) => {
      setStates(s.sort((a, b) => a.name.localeCompare(b.name)));
    });
  }, []);
  return states;
}

function Suggestions({ items, onPick }) {
  if (!items?.length) return null;
  return (
    <ul className="suggestions">
      {items.slice(0, 10).map((it) => (
        <li key={it} onClick={() => onPick(it)}>{it}</li>
      ))}
    </ul>
  );
}

function App() {
  const states = useStates();
  const [degree, setDegree] = React.useState('BA_Chem');
  const [state, setState] = React.useState('');
  const [institution, setInstitution] = React.useState('');
  const [course, setCourse] = React.useState('');
  const [instSuggestions, setInstSuggestions] = React.useState([]);
  const [loading, setLoading] = React.useState(false);
  const [result, setResult] = React.useState(null);

  React.useEffect(() => {
    const ctrl = new AbortController();
    const q = institution.trim();
    if (q.length < 2) {
      setInstSuggestions([]);
      return () => ctrl.abort();
    }
    const t = setTimeout(() => {
      const params = new URLSearchParams({ q, state });
      fetch(`/api/institutions?${params.toString()}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then(setInstSuggestions)
        .catch(() => {});
    }, 300);
    return () => { clearTimeout(t); ctrl.abort(); };
  }, [institution, state]);

  async function evaluate() {
    if (!institution.trim() || !course.trim()) return;
    setLoading(true);
    setResult({ status: 'loading' });
    try {
      const payload = { degree, institution: institution.trim(), course_code: course.trim(), state };
      const res = await fetch('/api/evaluate', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
      const data = await res.json();
      setResult(data);
    } catch (e) {
      setResult({ status: 'error' });
    } finally {
      setLoading(false);
    }
  }

  async function requestReview() {
    const payload = { degree, institution: institution.trim(), course_code: course.trim(), state };
    await fetch('/api/request-review', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) });
    setResult({ status: 'queued' });
  }

  return (
    <div>
      <div className="header">
        <div className="osu-brand">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor"><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zM12 18c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/><circle cx="12" cy="12" r="3"/></svg>
          Oregon State University
        </div>
        <h1>Chemistry Transfer Credit Evaluation</h1>
        <p className="subtitle">Discover how your chemistry courses transfer to Oregon State University.</p>
      </div>

      <div className="steps-container">
        <section className="card step-card">
          <div className="card-header"><h2>Select Your Degree Program</h2></div>
          <div className="card-body">
            <div className="form-group">
              <label className="form-label">Choose program:</label>
              <select className="form-select" value={degree} onChange={(e) => setDegree(e.target.value)}>
                <option value="BA_Chem">Bachelor of Arts in Chemistry</option>
                <option value="BS_Chem">Bachelor of Science in Chemistry</option>
                <option value="Minor_Chem">Chemistry Minor</option>
              </select>
            </div>
          </div>
        </section>

        <section className="card step-card">
          <div className="card-header"><h2>Enter Course Information</h2></div>
          <div className="card-body">
            <div className="row g-3">
              <div className="col-12 col-md-4">
                <div className="form-group">
                  <label className="form-label">State</label>
                  <select className="form-select" value={state} onChange={(e) => setState(e.target.value)}>
                    <option value="">All states</option>
                    {states.map((s) => (
                      <option key={s.abbr} value={s.abbr}>{`${s.name} (${s.abbr})`}</option>
                    ))}
                  </select>
                </div>
              </div>
              <div className="col-12 col-md-8 position-relative">
                <div className="form-group">
                  <label className="form-label">Institution</label>
                  <input className="form-control" value={institution} onChange={(e) => setInstitution(e.target.value)} placeholder="Start typing your institution name..." />
                  <Suggestions items={instSuggestions} onPick={(v) => { setInstitution(v); setInstSuggestions([]); }} />
                </div>
              </div>
              <div className="col-12 col-md-6">
                <div className="form-group">
                  <label className="form-label">Course Code</label>
                  <input className="form-control" value={course} onChange={(e) => setCourse(e.target.value)} placeholder="e.g., CHE 107LR, CHEM 1610" />
                </div>
              </div>
              <div className="col-12 col-md-6 d-grid">
                <button className="btn btn-primary" onClick={evaluate} disabled={loading || !institution.trim() || !course.trim()}>
                  {loading ? 'Checking...' : 'Check Equivalency'}
                </button>
              </div>
            </div>
          </div>
        </section>

        {result && (
          <section className="card step-card fade-in" id="results">
            <div className="card-header"><h2>Transfer Credit Results</h2></div>
            <div className="card-body">
              <div id="results-body" className="results-container">
                {result.status === 'loading' && (
                  <div className="loading"><div className="spinner" /> Searching...</div>
                )}
                {result.status === 'ok' && (
                  <div className="result">
                    <div className="equivalency-info">
                      <h3>✅ Course Match Found</h3>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>{result.result.institution}</strong><br />
                        <span>{result.result.course_code} — {result.result.course_title}</span>
                        <span className="badge-outline" style={{ marginLeft: '1rem' }}>{result.result.credits} credits</span>
                      </div>
                      <div style={{ marginBottom: '1rem' }}>
                        <strong>Oregon State Equivalent:</strong>
                        <div style={{ marginTop: '0.5rem' }}>
                          {(result.result.osu_equivalent || []).length ? result.result.osu_equivalent.map((eq) => (
                            <span key={eq} className="badge" style={{ marginRight: 6 }}>{eq}</span>
                          )) : <span className="badge badge-outline">No Direct Equivalent</span>}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                {result.status === 'no_match' && (
                  <div className="no-match">
                    <h3>❌ No Match Found</h3>
                    <p>{result.message || 'Not found in the database.'}</p>
                    <button className="btn btn-primary" onClick={requestReview}>Request Manual Review</button>
                  </div>
                )}
                {result.status === 'queued' && (
                  <div className="equivalency-info"><h3>✅ Review Request Submitted</h3></div>
                )}
                {result.status === 'error' && (
                  <div className="no-match"><h3>⚠️ Connection Error</h3></div>
                )}
              </div>
            </div>
          </section>
        )}
      </div>
    </div>
  );
}

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(<App />);


