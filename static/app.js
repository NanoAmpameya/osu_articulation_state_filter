// Enhanced Modern JavaScript with Improved UX
class OSUArticulationApp {
  constructor() {
    this.$ = (q) => document.querySelector(q);
    this.$$ = (q) => document.querySelectorAll(q);
    
    // DOM Elements
    this.elements = {
      degree: this.$("#degree"),
      state: this.$("#state"),
      institution: this.$("#institution"),
      instSuggest: this.$("#inst-suggest"),
      course: this.$("#course"),
      btn: this.$("#evaluate"),
      results: this.$("#results"),
      resultsBody: this.$("#results-body")
    };
    
    // State
    this.debounceTimer = null;
    this.isLoading = false;
    
    this.init();
  }
  
  async init() {
    await this.loadStates();
    this.bindEvents();
    this.setupFormValidation();
    this.setupAccessibility();
  }
  
  // Load states with loading indicator
  async loadStates() {
    try {
      const response = await fetch("/api/states");
      const states = await response.json();
      
      states.sort((a, b) => a.name.localeCompare(b.name));
      
      // Add states with enhanced options
      states.forEach(state => {
        const option = document.createElement("option");
        option.value = state.abbr;
        option.textContent = `${state.name} (${state.abbr})`;
        this.elements.state.appendChild(option);
      });
    } catch (error) {
      console.error("Failed to load states:", error);
      this.showNotification("Failed to load states. Please refresh the page.", "error");
    }
  }
  
  // Enhanced event binding
  bindEvents() {
    // Institution search with improved UX
    this.elements.institution.addEventListener("input", () => {
      clearTimeout(this.debounceTimer);
      this.debounceTimer = setTimeout(() => this.fetchInstitutions(), 300);
    });
    
    this.elements.state.addEventListener("change", () => {
      this.fetchInstitutions();
    });
    
    // Institution suggestion selection
    this.elements.instSuggest.addEventListener("click", (e) => {
      if (e.target.tagName === "LI") {
        this.elements.institution.value = e.target.textContent;
        this.elements.instSuggest.innerHTML = "";
        this.elements.course.focus(); // Better UX - focus next field
      }
    });
    
    // Keyboard navigation for suggestions
    this.elements.institution.addEventListener("keydown", (e) => {
      this.handleSuggestionKeyboard(e);
    });
    
    // Main evaluation button
    this.elements.btn.addEventListener("click", () => this.evaluateTransfer());
    
    // Enter key support
    [this.elements.institution, this.elements.course].forEach(input => {
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter" && this.isFormValid()) {
          this.evaluateTransfer();
        }
      });
    });
    
    // Hide suggestions when clicking outside
    document.addEventListener("click", (e) => {
      if (!e.target.closest("#institution") && !e.target.closest("#inst-suggest")) {
        this.elements.instSuggest.innerHTML = "";
      }
    });
  }
  
  // Enhanced institution fetching with loading states
  async fetchInstitutions() {
    const query = this.elements.institution.value.trim();
    const state = this.elements.state.value;
    
    if (query.length < 2) {
      this.elements.instSuggest.innerHTML = "";
      return;
    }
    
    try {
      const url = `/api/institutions?q=${encodeURIComponent(query)}&state=${encodeURIComponent(state)}`;
      const response = await fetch(url);
      const institutions = await response.json();
      
      this.renderSuggestions(institutions);
    } catch (error) {
      console.error("Failed to fetch institutions:", error);
      this.elements.instSuggest.innerHTML = '<li style="color: var(--error);">Failed to load institutions</li>';
    }
  }
  
  // Enhanced suggestions rendering
  renderSuggestions(institutions) {
    if (institutions.length === 0) {
      this.elements.instSuggest.innerHTML = '<li style="color: var(--text-muted);">No institutions found</li>';
      return;
    }
    
    this.elements.instSuggest.innerHTML = institutions
      .slice(0, 10) // Limit to 10 suggestions
      .map(institution => `<li data-value="${institution}">${institution}</li>`)
      .join("");
  }
  
  // Keyboard navigation for suggestions
  handleSuggestionKeyboard(e) {
    const suggestions = this.$$('#inst-suggest li');
    const current = this.$('#inst-suggest li.active');
    let index = Array.from(suggestions).indexOf(current);
    
    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        index = Math.min(index + 1, suggestions.length - 1);
        this.setActiveSuggestion(suggestions, index);
        break;
      case "ArrowUp":
        e.preventDefault();
        index = Math.max(index - 1, 0);
        this.setActiveSuggestion(suggestions, index);
        break;
      case "Enter":
        e.preventDefault();
        if (current) {
          this.elements.institution.value = current.textContent;
          this.elements.instSuggest.innerHTML = "";
          this.elements.course.focus();
        }
        break;
      case "Escape":
        this.elements.instSuggest.innerHTML = "";
        break;
    }
  }
  
  setActiveSuggestion(suggestions, index) {
    suggestions.forEach(li => li.classList.remove("active"));
    if (suggestions[index]) {
      suggestions[index].classList.add("active");
    }
  }
  
  // Form validation
  setupFormValidation() {
    [this.elements.institution, this.elements.course].forEach(input => {
      input.addEventListener("blur", () => this.validateField(input));
      input.addEventListener("input", () => this.clearFieldError(input));
    });
  }
  
  validateField(field) {
    const value = field.value.trim();
    const isValid = value.length > 0;
    
    field.classList.toggle("error", !isValid);
    
    if (!isValid) {
      this.showFieldError(field, "This field is required");
    }
    
    return isValid;
  }
  
  clearFieldError(field) {
    field.classList.remove("error");
    const errorEl = field.parentNode.querySelector(".field-error");
    if (errorEl) errorEl.remove();
  }
  
  showFieldError(field, message) {
    this.clearFieldError(field);
    const errorEl = document.createElement("div");
    errorEl.className = "field-error";
    errorEl.style.cssText = "color: var(--error); font-size: 0.875rem; margin-top: 0.25rem;";
    errorEl.textContent = message;
    field.parentNode.appendChild(errorEl);
  }
  
  isFormValid() {
    const institution = this.elements.institution.value.trim();
    const course = this.elements.course.value.trim();
    return institution.length > 0 && course.length > 0;
  }
  
  // Enhanced evaluation with better UX
  async evaluateTransfer() {
    if (!this.isFormValid()) {
      this.showNotification("Please fill in all required fields", "warning");
      return;
    }
    
    if (this.isLoading) return;
    
    this.setLoading(true);
    this.showResults();
    this.showLoadingState();
    
    const payload = {
      degree: this.elements.degree.value,
      institution: this.elements.institution.value.trim(),
      course_code: this.elements.course.value.trim(),
      state: this.elements.state.value
    };
    
    try {
      const response = await fetch("/api/evaluate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      const data = await response.json();
      
      // Simulate minimum loading time for better UX
      await new Promise(resolve => setTimeout(resolve, 500));
      
      if (data.status === "ok") {
        this.renderSuccessResults(data);
      } else {
        this.renderNoMatchResults(data, payload);
      }
    } catch (error) {
      console.error("Evaluation failed:", error);
      this.renderErrorResults();
    } finally {
      this.setLoading(false);
    }
  }
  
  // Loading state management
  setLoading(loading) {
    this.isLoading = loading;
    this.elements.btn.disabled = loading;
    
    if (loading) {
      this.elements.btn.innerHTML = `
        <div class="spinner"></div>
        Checking...
      `;
    } else {
      this.elements.btn.innerHTML = `
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z"/>
        </svg>
        Check Equivalency
      `;
    }
  }
  
  showResults() {
    this.elements.results.hidden = false;
    this.elements.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }
  
  showLoadingState() {
    this.elements.resultsBody.innerHTML = `
      <div class="loading">
        <div class="spinner"></div>
        <span>Searching our database for course equivalencies...</span>
      </div>
    `;
  }
  
  // Enhanced results rendering
  renderSuccessResults(data) {
    const { result: match, course_meta: meta = [] } = data;
    
    const equivalencyBadges = match.osu_equivalent && match.osu_equivalent.length
      ? match.osu_equivalent.map(eq => `<span class="badge">${eq}</span>`).join(" ")
      : '<span class="badge badge-outline">No Direct Equivalent</span>';
    
    this.elements.resultsBody.innerHTML = `
      <div class="result slide-up">
        <div class="equivalency-info">
          <h3>✅ Course Match Found</h3>
          <div style="margin-bottom: 1rem;">
            <strong style="color: var(--text-primary); font-size: 1.1rem;">${match.institution}</strong>
            <br>
            <span style="color: var(--text-secondary);">${match.course_code} — ${match.course_title}</span>
            <span class="badge-outline" style="margin-left: 1rem;">${match.credits} credits</span>
          </div>
          
          <div style="margin-bottom: 1rem;">
            <strong>Oregon State Equivalent:</strong>
            <div style="margin-top: 0.5rem;">${equivalencyBadges}</div>
            ${match.ldt && match.ldt > 0 ? `<div style="margin-top: 0.5rem;"><strong>Lower Division Transfer:</strong> ${match.ldt} credits</div>` : ""}
          </div>
          
          ${match.catalog_link ? `
            <div style="margin-top: 1rem;">
              <a href="${match.catalog_link}" target="_blank" rel="noopener" class="btn btn-secondary">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M19 19H5V5h7V3H5c-1.11 0-2 .9-2 2v14c0 1.1.89 2 2 2h14c1.1 0 2-.9 2-2v-7h-2v7zM14 3v2h3.59l-9.83 9.83 1.41 1.41L19 6.41V10h2V3h-7z"/>
                </svg>
                View Course Catalog
              </a>
            </div>
          ` : ""}
          
          ${match.notes ? `<div style="margin-top: 1rem; padding: 1rem; background: var(--gray-50); border-radius: var(--radius-base);"><em>${match.notes}</em></div>` : ""}
        </div>
        
        ${meta.length ? this.renderMetadata(meta) : ""}
      </div>
    `;
  }
  
  renderMetadata(meta) {
    return `
      <div style="margin-top: 2rem;">
        <h3>Oregon State Course Details</h3>
        ${meta.map(course => `
          <div class="meta-card slide-up">
            <div class="meta-header">
              <span class="badge badge-secondary">${course.subject_code} ${course.course_number}</span>
              <span class="meta-title">${course.title}</span>
              <span class="meta-credits">${course.credits} credits</span>
            </div>
            <div class="meta-body">
              ${course.description ? `<p style="margin-bottom: 1rem;">${course.description}</p>` : ""}
              <ul class="meta-list">
                ${course.attributes && course.attributes.length ? `<li><strong>Attributes:</strong> ${course.attributes.join(", ")}</li>` : ""}
                ${course.prerequisites ? `<li><strong>Prerequisites:</strong> ${course.prerequisites}</li>` : ""}
                ${course.corequisites ? `<li><strong>Corequisites:</strong> ${course.corequisites}</li>` : ""}
                ${course.equivalency && course.equivalency.length ? `<li><strong>Equivalency:</strong> ${course.equivalency.join(", ")}</li>` : ""}
              </ul>
            </div>
          </div>
        `).join("")}
      </div>
    `;
  }
  
  renderNoMatchResults(data, payload) {
    this.elements.resultsBody.innerHTML = `
      <div class="no-match slide-up">
        <h3>❌ No Match Found</h3>
        <p>${data.message || "This course was not found in our Oregon State University Chemistry articulation database."}</p>
        <p style="margin-bottom: 1.5rem;">Don't worry! You can submit this course for manual review by our academic advisors.</p>
        <button id="reqBtn" class="btn btn-primary">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M20 4H4c-1.1 0-2 .9-2 2v12c0 1.1.9 2 2 2h16c1.1 0 2-.9 2-2V6c0-1.1-.9-2-2-2zm0 4l-8 5-8-5V6l8 5 8-5v2z"/>
          </svg>
          Request Manual Review
        </button>
      </div>
    `;
    
    this.$("#reqBtn").onclick = () => this.requestReview(payload);
  }
  
  renderErrorResults() {
    this.elements.resultsBody.innerHTML = `
      <div class="no-match slide-up">
        <h3>⚠️ Connection Error</h3>
        <p>We encountered an error while checking the course equivalency. Please try again.</p>
        <button class="btn btn-primary" onclick="location.reload()">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
            <path d="M17.65 6.35C16.2 4.9 14.21 4 12 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
          </svg>
          Try Again
        </button>
      </div>
    `;
  }
  
  // Enhanced review request
  async requestReview(payload) {
    const button = this.$("#reqBtn");
    button.disabled = true;
    button.innerHTML = `
      <div class="spinner"></div>
      Submitting...
    `;
    
    try {
      await fetch("/api/request-review", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload)
      });
      
      this.elements.resultsBody.innerHTML = `
        <div class="equivalency-info slide-up">
          <h3>✅ Review Request Submitted</h3>
          <p>Thank you! Your course has been submitted for manual review by our academic advisors.</p>
          <p>You should receive an email notification once the evaluation is complete.</p>
        </div>
      `;
      
      this.showNotification("Review request submitted successfully", "success");
    } catch (error) {
      console.error("Failed to submit review request:", error);
      button.disabled = false;
      button.innerHTML = "Request Manual Review";
      this.showNotification("Failed to submit review request. Please try again.", "error");
    }
  }
  
  // Notification system
  showNotification(message, type = "info") {
    const notification = document.createElement("div");
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--${type === "error" ? "error" : type === "success" ? "success" : type === "warning" ? "warning" : "info"});
      color: white;
      padding: 1rem 1.5rem;
      border-radius: var(--radius-base);
      box-shadow: var(--shadow-lg);
      z-index: 10000;
      animation: slideIn 0.3s ease-out;
    `;
    
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
      notification.style.animation = "slideOut 0.3s ease-in forwards";
      setTimeout(() => notification.remove(), 300);
    }, 4000);
  }
  
  // Accessibility improvements
  setupAccessibility() {
    // Add ARIA labels
    this.elements.institution.setAttribute("aria-describedby", "institution-help");
    this.elements.course.setAttribute("aria-describedby", "course-help");
    
    // Add live region for screen readers
    const liveRegion = document.createElement("div");
    liveRegion.setAttribute("aria-live", "polite");
    liveRegion.setAttribute("aria-atomic", "true");
    liveRegion.className = "sr-only";
    liveRegion.id = "live-region";
    document.body.appendChild(liveRegion);
  }
  
  // Update live region for screen readers
  announceToScreenReader(message) {
    const liveRegion = this.$("#live-region");
    if (liveRegion) {
      liveRegion.textContent = message;
    }
  }
}

// Initialize app when DOM is loaded
document.addEventListener("DOMContentLoaded", () => {
  new OSUArticulationApp();
});

// Add CSS animations
const style = document.createElement("style");
style.textContent = `
  @keyframes slideIn {
    from { transform: translateX(100%); opacity: 0; }
    to { transform: translateX(0); opacity: 1; }
  }
  
  @keyframes slideOut {
    from { transform: translateX(0); opacity: 1; }
    to { transform: translateX(100%); opacity: 0; }
  }
  
  .suggestions li.active {
    background: var(--primary) !important;
    color: white !important;
  }
  
  .field-error {
    animation: fadeIn 0.2s ease-out;
  }
  
  .form-control.error {
    border-color: var(--error) !important;
    box-shadow: 0 0 0 3px rgba(239, 68, 68, 0.1) !important;
  }
  
  .sr-only {
    position: absolute;
    width: 1px;
    height: 1px;
    padding: 0;
    margin: -1px;
    overflow: hidden;
    clip: rect(0, 0, 0, 0);
    white-space: nowrap;
    border: 0;
  }
`;
document.head.appendChild(style);
