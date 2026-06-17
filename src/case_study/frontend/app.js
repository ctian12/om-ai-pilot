const API_BASE = "http://localhost:5001";

// ── STATE ──────────────────────────────────────────────────────────────────────
let state = {
  concept: "",
  course: "",
  level: "",
  dateRange: "",
  researchResults: null,   // full research response from backend
  selectedArticles: [],    // indices of selected article cards
  caseStudy: null          // generated case study
};

// ── STEP NAVIGATION ────────────────────────────────────────────────────────────
function goToStep(n) {
  for (let i = 1; i <= 3; i++) {
    const section = document.getElementById(`step-${i}`);
    const navItem = document.getElementById(`nav-${i}`);
    const summary = document.getElementById(`summary-${i}`);
    const body = document.getElementById(`body-${i}`);

    if (i < n) {
      // past step — show summary bar, hide body
      section.style.display = "block";
      if (summary) summary.style.display = "flex";
      if (body) body.style.display = "none";
      navItem.className = "step-item done";
    } else if (i === n) {
      // current step — show body
      section.style.display = "block";
      if (summary) summary.style.display = "none";
      if (body) body.style.display = "block";
      navItem.className = "step-item active";
    } else {
      // future step — hide entirely
      section.style.display = "none";
      navItem.className = "step-item";
    }
  }
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ── OBJECTIVES ────────────────────────────────────────────────────────────────
function addObj() {
  const container = document.getElementById("objectives-container");
  const row = document.createElement("div");
  row.className = "obj-row";
  row.innerHTML = `
    <input type="text" placeholder="e.g. Analyze how disruptions propagate upstream..." />
    <button class="icon-btn" onclick="removeObj(this)" aria-label="Remove">✕</button>
  `;
  container.appendChild(row);
}

function removeObj(btn) {
  const rows = document.querySelectorAll(".obj-row");
  if (rows.length > 1) btn.closest(".obj-row").remove();
}

// ── STEP 1: RESEARCH ──────────────────────────────────────────────────────────
async function runResearch() {
  const concept = document.getElementById("concept").value.trim();
  const course = document.getElementById("course").value.trim();
  const level = document.getElementById("level").value;
  const dateRange = document.getElementById("date-range").value;
  const errorEl = document.getElementById("research-error");

  errorEl.style.display = "none";

  if (!concept) {
    showError("research-error", "Please enter a concept to research.");
    return;
  }
  if (!course) {
    showError("research-error", "Please enter a course name.");
    return;
  }

  // save to state
  state.concept = concept;
  state.course = course;
  state.level = level;
  state.dateRange = dateRange;

  const btn = document.getElementById("research-btn");
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;margin:0;"></div> Searching...`;

  try {
    const res = await fetch(`${API_BASE}/research`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ concept, course, level, date_range: dateRange })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Research failed");
    }

    const data = await res.json();
    state.researchResults = data;
    renderDebugPanel(data);
    state.selectedArticles = [];

    renderArticleCards(data.articles);

    // update summary bar for step 1
    document.getElementById("summary-1-text").textContent =
      `"${concept}" · ${course} · ${dateRange}`;

    // update step 2 header
    document.getElementById("concept-display").textContent = `"${concept}"`;

    goToStep(2);
  } catch (e) {
    showError("research-error", e.message);
    btn.disabled = false;
    btn.innerHTML = `Find examples <span class="btn-arrow">→</span>`;
  }
}

function renderArticleCards(articles) {
  const list = document.getElementById("articles-list");
  list.innerHTML = "";

  if (!articles || articles.length === 0) {
    list.innerHTML = `<p style="color:var(--ink-tertiary);font-size:14px;">No articles found. Try adjusting the concept or date range.</p>`;
    return;
  }

  articles.forEach((article, i) => {
    const card = document.createElement("div");
    card.className = "article-card";
    card.dataset.index = i;
    card.onclick = () => toggleArticle(i);

    card.innerHTML = `
      <div class="article-checkbox"></div>
      <div class="article-info">
        <div class="article-title">${escapeHtml(article.title || "Untitled")}</div>
        <div class="article-meta">
          <span>${escapeHtml(article.source || "")}</span>
          <span>${escapeHtml(article.date || "")}</span>
        </div>
        <div class="article-summary">${escapeHtml(article.summary || "")}</div>
        <div class="article-relevance">↳ ${escapeHtml(article.relevance || "")}</div>
        ${article.url ? `<div class="article-url"><a href="${escapeHtml(article.url)}" target="_blank" onclick="event.stopPropagation()">${escapeHtml(article.url)}</a></div>` : ""}
      </div>
    `;
    list.appendChild(card);
  });
}

function toggleArticle(index) {
  const card = document.querySelector(`.article-card[data-index="${index}"]`);
  const idx = state.selectedArticles.indexOf(index);
  if (idx === -1) {
    state.selectedArticles.push(index);
    card.classList.add("selected");
  } else {
    state.selectedArticles.splice(idx, 1);
    card.classList.remove("selected");
  }
}

// ── STEP 2: GENERATE ──────────────────────────────────────────────────────────
async function runGenerate() {
  if (state.selectedArticles.length === 0) {
    showError("select-error", "Please select at least one article.");
    return;
  }

  const objectives = [...document.querySelectorAll(".obj-row input")]
    .map(i => i.value.trim())
    .filter(Boolean);
  const extra = document.getElementById("extra").value.trim();

  // build article texts from research results
  const articles = state.selectedArticles.map(i => {
    const a = state.researchResults.articles[i];
    return `${a.title}\n${a.source} — ${a.date}\n\n${a.summary}`;
  });

  const btn = document.getElementById("generate-btn");
  btn.disabled = true;
  btn.innerHTML = `<div class="spinner" style="width:16px;height:16px;margin:0;"></div> Generating...`;
  document.getElementById("select-error").style.display = "none";

  // update summary bar for step 2
  const selectedTitles = state.selectedArticles
    .map(i => state.researchResults.articles[i].title)
    .join(", ");
  document.getElementById("summary-2-text").textContent = selectedTitles;

  try {
    const res = await fetch(`${API_BASE}/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        articles,
        course: state.course,
        level: state.level,
        objectives,
        extra
      })
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.error || "Generation failed");
    }

    const cs = await res.json();
    state.caseStudy = cs;
    renderCaseStudy(cs);
    goToStep(3);
  } catch (e) {
    showError("select-error", e.message);
    btn.disabled = false;
    btn.innerHTML = `Generate case study <span class="btn-arrow">→</span>`;
  }
}

// ── STEP 3: RENDER OUTPUT ─────────────────────────────────────────────────────
function renderCaseStudy(cs) {
  document.getElementById("cs-meta").textContent =
    `${state.level} · ${state.course}`;
  document.getElementById("cs-title").textContent = cs.title || "";
  document.getElementById("cs-overview").textContent = cs.overview || "";
  document.getElementById("cs-background").textContent = cs.background || "";
  document.getElementById("cs-challenge").textContent = cs.challenge || "";
  document.getElementById("cs-data").textContent = cs.data || "";
  document.getElementById("cs-notes").textContent = cs.teaching_notes || "";

  // stakeholders
  const stakeholdersEl = document.getElementById("cs-stakeholders");
  stakeholdersEl.innerHTML = (cs.stakeholders || []).map(s => `
    <div class="stakeholder-item">
      <div class="stakeholder-name">${escapeHtml(s.name)}</div>
      <div class="stakeholder-role">${escapeHtml(s.role)}</div>
    </div>
  `).join("");

  // timeline
  const timelineEl = document.getElementById("cs-timeline");
  timelineEl.innerHTML = (cs.timeline || []).map(t => `
    <div class="timeline-item">
      <span class="timeline-date">${escapeHtml(t.date)}</span>
      <span class="timeline-event">${escapeHtml(t.event)}</span>
    </div>
  `).join("");

  // questions
  const questionsEl = document.getElementById("cs-questions");
  questionsEl.innerHTML = (cs.questions || []).map(q =>
    `<li>${escapeHtml(q)}</li>`
  ).join("");
}

// ── COPY ALL ──────────────────────────────────────────────────────────────────
function copyAll() {
  const cs = state.caseStudy;
  if (!cs) return;

  const stakeholders = (cs.stakeholders || [])
    .map(s => `  ${s.name}: ${s.role}`)
    .join("\n");

  const timeline = (cs.timeline || [])
    .map(t => `  ${t.date} — ${t.event}`)
    .join("\n");

  const questions = (cs.questions || [])
    .map((q, i) => `  ${i + 1}. ${q}`)
    .join("\n");

  const full = [
    cs.title,
    "",
    cs.overview,
    "",
    "BACKGROUND",
    cs.background,
    "",
    "THE CHALLENGE",
    cs.challenge,
    "",
    "KEY STAKEHOLDERS",
    stakeholders,
    "",
    "TIMELINE",
    timeline,
    "",
    "DATA & EVIDENCE",
    cs.data,
    "",
    "DISCUSSION QUESTIONS",
    questions,
    "",
    "TEACHING NOTES",
    cs.teaching_notes
  ].join("\n");

  navigator.clipboard.writeText(full).catch(() => {
    alert("Copy failed — please select and copy the text manually.");
  });
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function showError(id, message) {
  const el = document.getElementById(id);
  el.textContent = message;
  el.style.display = "block";
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function renderDebugPanel(data) {
    const debugEl = document.getElementById("debug-content");
    if (!debugEl) return;
  
    const query = data.debug_query
      ? `<div class="debug-query">Query: "${escapeHtml(data.debug_query)}"</div>`
      : "";
  
    const items = (data.debug_raw_results || []).map(r => `
      <div class="debug-item">
        <div class="debug-title">${escapeHtml(r.title)}</div>
        <div>${escapeHtml(r.date)}</div>
        <div class="debug-url">${escapeHtml(r.url)}</div>
        <div>${escapeHtml(r.content_preview)}...</div>
      </div>
    `).join("");
  
    debugEl.innerHTML = query + (items || "<p>No raw results to show.</p>");
  }
  