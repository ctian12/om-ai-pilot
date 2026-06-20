const API_BASE = "http://localhost:5001";

let currentRenameId = null;
let currentViewData = null;

// ── LOAD LIBRARY ──────────────────────────────────────────────────────────────
async function loadLibrary() {
  try {
    const res = await fetch(`${API_BASE}/library`);
    const data = await res.json();

    document.getElementById("loading").style.display = "none";

    const concepts = Object.keys(data);
    if (concepts.length === 0) {
      document.getElementById("empty-state").style.display = "block";
      return;
    }

    const content = document.getElementById("library-content");
    content.style.display = "block";
    content.innerHTML = "";

    concepts.forEach(concept => {
      const group = document.createElement("div");
      group.className = "concept-group";

      const items = data[concept].map(cs => `
        <div class="cs-row" id="row-${cs.id}">
          <div class="cs-row-info" onclick="viewCaseStudy(${cs.id})">
            <div class="cs-row-title">${escapeHtml(cs.title)}</div>
            <div class="cs-row-meta">
              <span>${escapeHtml(cs.course)}</span>
              <span>${escapeHtml(cs.level)}</span>
              <span>${formatDate(cs.created_at)}</span>
            </div>
          </div>
          <div class="cs-row-actions">
            <a class="action-btn" href="${API_BASE}/library/${cs.id}/export" target="_blank">Download PDF</a>
            <button class="action-btn" onclick="openRename(${cs.id}, '${escapeHtml(cs.title).replace(/'/g, "\\'")}')">Rename</button>
            <button class="action-btn delete" onclick="deleteCaseStudy(${cs.id})">Delete</button>
          </div>
        </div>
      `).join("");

      group.innerHTML = `
        <div class="concept-label">${escapeHtml(concept)}</div>
        ${items}
      `;
      content.appendChild(group);
    });

  } catch (e) {
    document.getElementById("loading").style.display = "none";
    document.getElementById("library-content").style.display = "block";
    document.getElementById("library-content").innerHTML =
      `<p style="color:var(--error);font-size:14px;">Failed to load library: ${e.message}</p>`;
  }
}

// ── VIEW ──────────────────────────────────────────────────────────────────────
async function viewCaseStudy(id) {
  try {
    const res = await fetch(`${API_BASE}/library/${id}`);
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    currentViewData = data;
    const cs = data.case_study;

    document.getElementById("view-meta").textContent = `${data.level} · ${data.course}`;
    document.getElementById("view-title").textContent = data.title;

    const stakeholders = (cs.stakeholders || []).map(s =>
      `<p><strong>${escapeHtml(s.name)}</strong> — ${escapeHtml(s.role)}</p>`
    ).join("");

    const timeline = (cs.timeline || []).map(t =>
      `<p><strong>${escapeHtml(t.date)}</strong> — ${escapeHtml(t.event)}</p>`
    ).join("");

    const questions = (cs.questions || []).map(q =>
      `<li>${escapeHtml(q)}</li>`
    ).join("");

    document.getElementById("view-body").innerHTML = `
      <div class="view-section">
        <h4>Overview</h4>
        <p>${escapeHtml(cs.overview || "")}</p>
      </div>
      <div class="view-section">
        <h4>Background</h4>
        <p>${escapeHtml(cs.background || "")}</p>
      </div>
      <div class="view-section">
        <h4>The challenge</h4>
        <p>${escapeHtml(cs.challenge || "")}</p>
      </div>
      <div class="view-section">
        <h4>Key stakeholders</h4>
        ${stakeholders}
      </div>
      <div class="view-section">
        <h4>Timeline</h4>
        ${timeline}
      </div>
      <div class="view-section">
        <h4>Data & evidence</h4>
        <p>${escapeHtml(cs.data || "")}</p>
      </div>
      <div class="view-section">
        <h4>Discussion questions</h4>
        <ol>${questions}</ol>
      </div>
      <div class="view-section view-teaching-notes">
        <h4>Teaching notes</h4>
        <p>${escapeHtml(cs.teaching_notes || "")}</p>
      </div>
    `;

    document.getElementById("view-overlay").style.display = "flex";
  } catch (e) {
    alert(`Failed to load case study: ${e.message}`);
  }
}

function closeViewModal() {
  document.getElementById("view-overlay").style.display = "none";
  currentViewData = null;
}

function copyFromModal() {
  if (!currentViewData) return;
  const cs = currentViewData.case_study;

  const stakeholders = (cs.stakeholders || [])
    .map(s => `  ${s.name}: ${s.role}`).join("\n");
  const timeline = (cs.timeline || [])
    .map(t => `  ${t.date} — ${t.event}`).join("\n");
  const questions = (cs.questions || [])
    .map((q, i) => `  ${i + 1}. ${q}`).join("\n");

  const full = [
    currentViewData.title, "",
    cs.overview, "",
    "BACKGROUND\n" + cs.background, "",
    "THE CHALLENGE\n" + cs.challenge, "",
    "KEY STAKEHOLDERS\n" + stakeholders, "",
    "TIMELINE\n" + timeline, "",
    "DATA & EVIDENCE\n" + cs.data, "",
    "DISCUSSION QUESTIONS\n" + questions, "",
    "TEACHING NOTES\n" + cs.teaching_notes
  ].join("\n");

  navigator.clipboard.writeText(full).catch(() => {
    alert("Copy failed — please select and copy manually.");
  });
}

// ── RENAME ────────────────────────────────────────────────────────────────────
function openRename(id, currentTitle) {
  currentRenameId = id;
  document.getElementById("rename-input").value = currentTitle;
  document.getElementById("modal-overlay").style.display = "flex";
  setTimeout(() => document.getElementById("rename-input").focus(), 50);
}

function closeModal() {
  document.getElementById("modal-overlay").style.display = "none";
  currentRenameId = null;
}

async function confirmRename() {
  const newTitle = document.getElementById("rename-input").value.trim();
  if (!newTitle || !currentRenameId) return;

  try {
    const res = await fetch(`${API_BASE}/library/${currentRenameId}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title: newTitle })
    });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // update title in the DOM without full reload
    const row = document.getElementById(`row-${currentRenameId}`);
    if (row) row.querySelector(".cs-row-title").textContent = newTitle;

    closeModal();
  } catch (e) {
    alert(`Failed to rename: ${e.message}`);
  }
}

// ── DELETE ────────────────────────────────────────────────────────────────────
async function deleteCaseStudy(id) {
  if (!confirm("Delete this case study? This can't be undone.")) return;

  try {
    const res = await fetch(`${API_BASE}/library/${id}`, { method: "DELETE" });
    const data = await res.json();
    if (data.error) throw new Error(data.error);

    // remove row from DOM
    const row = document.getElementById(`row-${id}`);
    if (row) {
      const group = row.closest(".concept-group");
      row.remove();

      // if no more rows in the group, remove the group
      if (group && group.querySelectorAll(".cs-row").length === 0) {
        group.remove();
      }
    }

    // if library is now empty, show empty state
    if (document.querySelectorAll(".cs-row").length === 0) {
      document.getElementById("library-content").style.display = "none";
      document.getElementById("empty-state").style.display = "block";
    }
  } catch (e) {
    alert(`Failed to delete: ${e.message}`);
  }
}

// ── UTILS ─────────────────────────────────────────────────────────────────────
function formatDate(isoString) {
  if (!isoString) return "";
  const d = new Date(isoString);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}

function escapeHtml(str) {
  if (!str) return "";
  return str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

// ── INIT ──────────────────────────────────────────────────────────────────────
loadLibrary();
