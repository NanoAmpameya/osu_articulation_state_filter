const $ = (q) => document.querySelector(q);
const degreeEl = $("#degree");
const stateEl = $("#state");
const institutionEl = $("#institution");
const instSuggest = $("#inst-suggest");
const courseEl = $("#course");
const btn = $("#evaluate");
const results = $("#results");
const resultsBody = $("#results-body");

window.addEventListener("DOMContentLoaded", async () => {
  const r = await fetch("/api/states");
  const states = await r.json();
  states.sort((a,b)=>a.name.localeCompare(b.name));
  for (const s of states) {
    const opt = document.createElement("option");
    opt.value = s.abbr;
    opt.textContent = `${s.name} (${s.abbr})`;
    stateEl.appendChild(opt);
  }
});

let debounce;
async function fetchInstitutions(){
  const q = encodeURIComponent(institutionEl.value.trim());
  const st = encodeURIComponent(stateEl.value);
  const url = `/api/institutions?q=${q}&state=${st}`;
  const r = await fetch(url);
  const items = await r.json();
  instSuggest.innerHTML = items.map(i=>`<li>${i}</li>`).join("");
}
institutionEl.addEventListener("input", ()=>{
  clearTimeout(debounce);
  debounce = setTimeout(fetchInstitutions, 200);
});
stateEl.addEventListener("change", fetchInstitutions);
instSuggest.addEventListener("click", (e)=>{
  if (e.target.tagName === "LI") {
    institutionEl.value = e.target.textContent;
    instSuggest.innerHTML = "";
  }
});

btn.addEventListener("click", async ()=>{
  results.hidden = false;
  resultsBody.innerHTML = "Evaluating…";
  const payload = {
    degree: degreeEl.value,
    institution: institutionEl.value,
    course_code: courseEl.value,
    state: stateEl.value
  };
  const r = await fetch("/api/evaluate", {
    method: "POST",
    headers: {"Content-Type":"application/json"},
    body: JSON.stringify(payload)
  });
  const data = await r.json();
  if (data.status === "ok") {
    const m = data.result;
    const meta = data.course_meta || [];
    resultsBody.innerHTML = `
      <div class="result">
        <h3>Course Equivalencies</h3>
        <p><strong>${m.institution}</strong> • ${m.course_code} — ${m.course_title} (${m.credits} cr)</p>
        <p>OSU Equivalent: <span class="badge">${(m.osu_equivalent && m.osu_equivalent.length) ? m.osu_equivalent.join(", ") : "Not Equivalent"}</span>
           ${(m.ldt && m.ldt>0) ? ` • LDT: ${m.ldt} cr` : ""}</p>
        ${m.catalog_link ? `<p><a href="${m.catalog_link}" target="_blank" rel="noopener">Catalog Link</a></p>` : ""}
        ${m.notes ? `<p><em>${m.notes}</em></p>` : ""}
        ${meta.length ? `<h3>OSU Course Metadata</h3>` : ""}
        ${meta.length ? meta.map(c => `
          <div class="meta-card">
            <div class="meta-header">
              <span class="badge">${c.subject_code} ${c.course_number}</span>
              <strong>${c.title}</strong> • ${c.credits} cr
            </div>
            <div class="meta-body">
              ${c.description ? `<p>${c.description}</p>` : ""}
              <ul class="meta-list">
                ${c.attributes && c.attributes.length ? `<li><strong>Attributes:</strong> ${c.attributes.join(", ")}</li>` : ""}
                ${c.prerequisites ? `<li><strong>Prerequisites:</strong> ${c.prerequisites}</li>` : ""}
                ${c.corequisites ? `<li><strong>Corequisites:</strong> ${c.corequisites}</li>` : ""}
                ${c.equivalency && c.equivalency.length ? `<li><strong>Equivalency:</strong> ${c.equivalency.join(", ")}</li>` : ""}
              </ul>
            </div>
          </div>
        `).join("") : ""}
      </div>
    `;
  } else {
    resultsBody.innerHTML = `
      <p>${data.message || "No match found."}</p>
      <button id="reqBtn">Request Review</button>
    `;
    document.querySelector("#reqBtn").onclick = async () => {
      await fetch("/api/request-review", {
        method: "POST",
        headers: {"Content-Type":"application/json"},
        body: JSON.stringify(payload)
      });
      resultsBody.innerHTML = "<p>Submitted for manual review. You’ll be notified once evaluated.</p>";
    };
  }
});
