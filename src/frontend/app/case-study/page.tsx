"use client";

import { useState } from "react";

// ── TYPES ──────────────────────────────────────────────────────────────────────

interface Article {
  title: string;
  source: string;
  date: string;
  url: string;
  summary: string;
  relevance: string;
}

interface ResearchResult {
  concept: string;
  articles: Article[];
  debug_raw_results: { title: string; url: string; date: string; content_preview: string }[];
  debug_query: string;
}

interface CaseStudy {
  title: string;
  overview: string;
  background: string;
  challenge: string;
  stakeholders: { name: string; role: string }[];
  timeline: { date: string; event: string }[];
  data: string;
  questions: string[];
  teaching_notes: string;
}

// ── STEP INDICATOR ─────────────────────────────────────────────────────────────

function StepIndicator({ current }: { current: number }) {
  const steps = ["Research", "Select", "Generate"];
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 32 }}>
      {steps.map((label, i) => {
        const n = i + 1;
        const active = n === current;
        const done = n < current;
        return (
          <div key={n} style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 6, opacity: active ? 1 : done ? 0.6 : 0.35 }}>
              <div style={{
                width: 22, height: 22, borderRadius: "50%",
                border: `1.5px solid var(--navy)`,
                background: active ? "var(--navy)" : done ? "var(--sage)" : "transparent",
                borderColor: done ? "var(--sage)" : "var(--navy)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 11, fontWeight: 600,
                color: active || done ? "white" : "var(--navy)",
              }}>
                {n}
              </div>
              <span style={{ fontSize: 13, fontWeight: 500, color: "var(--navy)" }}>{label}</span>
            </div>
            {i < steps.length - 1 && (
              <div style={{ width: 24, height: 1, background: "var(--border)" }} />
            )}
          </div>
        );
      })}
    </div>
  );
}

// ── SUMMARY BAR ────────────────────────────────────────────────────────────────

function SummaryBar({ label, text, onEdit }: { label: string; text: string; onEdit: () => void }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 12,
      background: "var(--navy-light)", border: "1px solid var(--border)",
      borderRadius: "var(--radius)", padding: "10px 14px", marginBottom: 32,
    }}>
      <span style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", color: "var(--navy)", flexShrink: 0 }}>{label}</span>
      <span style={{ fontSize: 14, color: "var(--ink-secondary)", flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{text}</span>
      <button onClick={onEdit} style={{
        background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)",
        padding: "3px 10px", fontSize: 12, cursor: "pointer", color: "var(--ink-secondary)", flexShrink: 0,
      }}>Edit</button>
    </div>
  );
}

// ── MAIN PAGE ──────────────────────────────────────────────────────────────────

export default function CaseStudyPage() {
  const [step, setStep] = useState(1);

  // step 1 state
  const [concept, setConcept] = useState("");
  const [course, setCourse] = useState("Supply Chain Management");
  const [level, setLevel] = useState("Undergraduate");
  const [dateRange, setDateRange] = useState("last 6 months");
  const [researchLoading, setResearchLoading] = useState(false);
  const [researchError, setResearchError] = useState("");
  const [researchResults, setResearchResults] = useState<ResearchResult | null>(null);

  // step 2 state
  const [selectedArticles, setSelectedArticles] = useState<number[]>([]);
  const [objectives, setObjectives] = useState<string[]>([""]);
  const [extra, setExtra] = useState("");
  const [generateLoading, setGenerateLoading] = useState(false);
  const [generateError, setGenerateError] = useState("");

  // step 3 state
  const [caseStudy, setCaseStudy] = useState<CaseStudy | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");

  // ── STEP 1: RESEARCH ──────────────────────────────────────────────────────────

  async function runResearch() {
    if (!concept.trim()) { setResearchError("Please enter a concept."); return; }
    if (!course.trim()) { setResearchError("Please enter a course name."); return; }

    setResearchError("");
    setResearchLoading(true);

    try {
      const res = await fetch("/api/case-study/research", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ concept, course, level, date_range: dateRange }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setResearchResults(data);
      setSelectedArticles([]);
      setStep(2);
    } catch (e: unknown) {
      setResearchError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setResearchLoading(false);
    }
  }

  // ── STEP 2: GENERATE ──────────────────────────────────────────────────────────

  async function runGenerate() {
    if (selectedArticles.length === 0) { setGenerateError("Please select at least one article."); return; }

    setGenerateError("");
    setGenerateLoading(true);

    const articles = selectedArticles.map(i => {
      const a = researchResults!.articles[i];
      return `${a.title}\n${a.source} — ${a.date}\n\n${a.summary}`;
    });

    try {
      const res = await fetch("/api/case-study/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          articles,
          course,
          level,
          objectives: objectives.filter(Boolean),
          extra,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setCaseStudy(data);
      setSaveStatus("idle");
      setStep(3);
    } catch (e: unknown) {
      setGenerateError(e instanceof Error ? e.message : "Something went wrong");
    } finally {
      setGenerateLoading(false);
    }
  }

  // ── SAVE ──────────────────────────────────────────────────────────────────────

  async function saveCaseStudy() {
    if (!caseStudy) return;
    setSaveStatus("saving");
    try {
      const res = await fetch("/api/case-study/library", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: caseStudy.title,
          concept,
          course,
          level,
          date_range: dateRange,
          articles: selectedArticles.map(i => researchResults!.articles[i]),
          objectives: objectives.filter(Boolean),
          case_study: caseStudy,
        }),
      });
      const data = await res.json();
      if (data.error) throw new Error(data.error);
      setSaveStatus("saved");
    } catch {
      setSaveStatus("idle");
      alert("Failed to save. Please try again.");
    }
  }

  // ── COPY ──────────────────────────────────────────────────────────────────────

  function copyAll() {
    if (!caseStudy) return;
    const stakeholders = caseStudy.stakeholders.map(s => `  ${s.name}: ${s.role}`).join("\n");
    const timeline = caseStudy.timeline.map(t => `  ${t.date} — ${t.event}`).join("\n");
    const questions = caseStudy.questions.map((q, i) => `  ${i + 1}. ${q}`).join("\n");
    const full = [
      caseStudy.title, "", caseStudy.overview, "",
      "BACKGROUND\n" + caseStudy.background, "",
      "THE CHALLENGE\n" + caseStudy.challenge, "",
      "KEY STAKEHOLDERS\n" + stakeholders, "",
      "TIMELINE\n" + timeline, "",
      "DATA & EVIDENCE\n" + caseStudy.data, "",
      "DISCUSSION QUESTIONS\n" + questions, "",
      "TEACHING NOTES\n" + caseStudy.teaching_notes,
    ].join("\n");
    navigator.clipboard.writeText(full);
  }

  // ── RENDER ────────────────────────────────────────────────────────────────────

  return (
    <div>
      <StepIndicator current={step} />

      {/* ── STEP 1 ── */}
      {step >= 2 && (
        <SummaryBar
          label="Research"
          text={`"${concept}" · ${course} · ${dateRange}`}
          onEdit={() => setStep(1)}
        />
      )}

      {step === 1 && (
        <div>
          <div style={{ marginBottom: 32 }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, letterSpacing: "-0.5px", color: "var(--ink)", marginBottom: 8 }}>
              Find a real-world example
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
              Enter the concept you want to teach. The researcher will find recent events that illustrate it.
            </p>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }}>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6 }}>Concept to teach</label>
              <input
                type="text"
                value={concept}
                onChange={e => setConcept(e.target.value)}
                placeholder="e.g. Bullwhip effect, supplier diversification, last mile logistics"
                style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--ink)", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6 }}>Course</label>
              <input
                type="text"
                value={course}
                onChange={e => setCourse(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--ink)", outline: "none" }}
              />
            </div>
            <div>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6 }}>Education level</label>
              <select
                value={level}
                onChange={e => setLevel(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--ink)", outline: "none" }}
              >
                <option>Undergraduate</option>
                <option>Graduate</option>
                <option>High school</option>
                <option>Executive / professional</option>
              </select>
            </div>
            <div style={{ gridColumn: "1 / -1" }}>
              <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6 }}>Date range</label>
              <select
                value={dateRange}
                onChange={e => setDateRange(e.target.value)}
                style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--ink)", outline: "none" }}
              >
                <option value="last month">Last month</option>
                <option value="last 6 months">Last 6 months</option>
                <option value="last year">Last year</option>
                <option value="last 2 years">Last 2 years</option>
              </select>
            </div>
          </div>

          {researchError && (
            <div style={{ background: "var(--error-bg)", border: "1px solid #f5c6c0", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13, color: "var(--error)", marginBottom: 12 }}>
              {researchError}
            </div>
          )}

          <button
            onClick={runResearch}
            disabled={researchLoading}
            style={{
              padding: "11px 20px", background: "var(--navy)", color: "white", border: "none",
              borderRadius: "var(--radius)", fontSize: 14, fontWeight: 500, cursor: researchLoading ? "not-allowed" : "pointer",
              opacity: researchLoading ? 0.5 : 1,
            }}
          >
            {researchLoading ? "Searching..." : "Find examples →"}
          </button>
        </div>
      )}

      {/* ── STEP 2 ── */}
      {step >= 3 && researchResults && (
        <SummaryBar
          label="Selected"
          text={selectedArticles.map(i => researchResults.articles[i].title).join(", ")}
          onEdit={() => setStep(2)}
        />
      )}

      {step === 2 && researchResults && (
        <div>
          <div style={{ marginBottom: 24 }}>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 28, letterSpacing: "-0.5px", color: "var(--ink)", marginBottom: 8 }}>
              Select your sources
            </h1>
            <p style={{ fontSize: 15, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
              Choose one or more articles to build the case study from. Each illustrates <strong>&quot;{concept}&quot;</strong>.
            </p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12, marginBottom: 24 }}>
            {researchResults.articles.map((article, i) => {
              const selected = selectedArticles.includes(i);
              return (
                <div
                  key={i}
                  onClick={() => {
                    setSelectedArticles(prev =>
                      prev.includes(i) ? prev.filter(x => x !== i) : [...prev, i]
                    );
                  }}
                  style={{
                    background: "var(--surface)",
                    border: `1.5px solid ${selected ? "var(--navy)" : "var(--border)"}`,
                    boxShadow: selected ? "0 0 0 3px var(--navy-light)" : "none",
                    borderRadius: "var(--radius-lg)",
                    padding: "16px 18px",
                    cursor: "pointer",
                    display: "flex",
                    gap: 14,
                  }}
                >
                  <div style={{
                    width: 18, height: 18, border: `1.5px solid ${selected ? "var(--navy)" : "var(--border)"}`,
                    borderRadius: 4, flexShrink: 0, marginTop: 2,
                    background: selected ? "var(--navy)" : "transparent",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 11, color: "white",
                  }}>
                    {selected && "✓"}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: 15, fontWeight: 500, color: "var(--ink)", marginBottom: 4 }}>{article.title}</div>
                    <div style={{ fontSize: 12, color: "var(--ink-tertiary)", marginBottom: 8, display: "flex", gap: 10 }}>
                      <span>{article.source}</span>
                      <span>{article.date}</span>
                    </div>
                    <div style={{ fontSize: 13, color: "var(--ink-secondary)", lineHeight: 1.6, marginBottom: 8 }}>{article.summary}</div>
                    <div style={{ fontSize: 12, color: "var(--navy)", background: "var(--navy-light)", borderRadius: 4, padding: "5px 8px", lineHeight: 1.5 }}>
                      ↳ {article.relevance}
                    </div>
                    {article.url && (
                      <div style={{ fontSize: 12, color: "var(--sage)", marginTop: 6, wordBreak: "break-all" }}>
                        <a href={article.url} target="_blank" rel="noreferrer" onClick={e => e.stopPropagation()}>{article.url}</a>
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* debug panel */}
          <details style={{ border: "1px dashed var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", marginBottom: 24, background: "#FAFAF7" }}>
            <summary style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-tertiary)", cursor: "pointer" }}>
              Debug: raw search results
            </summary>
            <div style={{ marginTop: 10 }}>
              <p style={{ fontSize: 12, color: "var(--ink-tertiary)", fontFamily: "monospace", marginBottom: 8 }}>
                Query: &quot;{researchResults.debug_query}&quot;
              </p>
              {researchResults.debug_raw_results.map((r, i) => (
                <div key={i} style={{ fontSize: 12, padding: "8px 0", borderTop: "1px solid var(--border)", color: "var(--ink-secondary)", lineHeight: 1.5 }}>
                  <div style={{ fontWeight: 600, color: "var(--ink)" }}>{r.title}</div>
                  <div>{r.date}</div>
                  <div style={{ color: "var(--sage)", wordBreak: "break-all" }}>{r.url}</div>
                  <div>{r.content_preview}...</div>
                </div>
              ))}
            </div>
          </details>

          {/* objectives */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6 }}>Learning objectives</label>
            {objectives.map((obj, i) => (
              <div key={i} style={{ display: "flex", gap: 8, marginBottom: 8 }}>
                <input
                  type="text"
                  value={obj}
                  onChange={e => {
                    const updated = [...objectives];
                    updated[i] = e.target.value;
                    setObjectives(updated);
                  }}
                  placeholder="e.g. Understand how demand uncertainty amplifies up the supply chain"
                  style={{ flex: 1, padding: "9px 12px", fontSize: 14, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--ink)", outline: "none" }}
                />
                <button
                  onClick={() => setObjectives(objectives.filter((_, j) => j !== i))}
                  disabled={objectives.length === 1}
                  style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "6px 10px", cursor: "pointer", color: "var(--ink-tertiary)", fontSize: 12 }}
                >
                  ✕
                </button>
              </div>
            ))}
            <button
              onClick={() => setObjectives([...objectives, ""])}
              style={{ background: "none", border: "1px dashed var(--border)", borderRadius: "var(--radius)", padding: "7px 14px", cursor: "pointer", fontSize: 13, color: "var(--ink-secondary)", width: "100%" }}
            >
              + Add objective
            </button>
          </div>

          {/* extra */}
          <div style={{ marginBottom: 16 }}>
            <label style={{ display: "block", fontSize: 13, fontWeight: 500, color: "var(--ink-secondary)", marginBottom: 6 }}>
              Additional instructions <span style={{ fontWeight: 400, color: "var(--ink-tertiary)" }}>(optional)</span>
            </label>
            <textarea
              value={extra}
              onChange={e => setExtra(e.target.value)}
              placeholder="e.g. Focus on ethical dimensions, suitable for a 75-minute class..."
              style={{ width: "100%", padding: "9px 12px", fontSize: 14, border: "1px solid var(--border)", borderRadius: "var(--radius)", background: "var(--surface)", color: "var(--ink)", outline: "none", minHeight: 72, resize: "vertical" }}
            />
          </div>

          {generateError && (
            <div style={{ background: "var(--error-bg)", border: "1px solid #f5c6c0", borderRadius: "var(--radius)", padding: "10px 14px", fontSize: 13, color: "var(--error)", marginBottom: 12 }}>
              {generateError}
            </div>
          )}

          <button
            onClick={runGenerate}
            disabled={generateLoading}
            style={{
              padding: "11px 20px", background: "var(--navy)", color: "white", border: "none",
              borderRadius: "var(--radius)", fontSize: 14, fontWeight: 500,
              cursor: generateLoading ? "not-allowed" : "pointer", opacity: generateLoading ? 0.5 : 1,
            }}
          >
            {generateLoading ? "Generating..." : "Generate case study →"}
          </button>
        </div>
      )}

      {/* ── STEP 3 ── */}
      {step === 3 && caseStudy && (
        <div>
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 36 }}>
            <button
              onClick={() => { setStep(1); setCaseStudy(null); setSaveStatus("idle"); }}
              style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "7px 14px", cursor: "pointer", fontSize: 13, color: "var(--ink-secondary)" }}
            >
              ← Start over
            </button>
            <div style={{ display: "flex", gap: 8 }}>
              <button
                onClick={saveCaseStudy}
                disabled={saveStatus !== "idle"}
                style={{
                  background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)",
                  padding: "7px 14px", cursor: saveStatus !== "idle" ? "default" : "pointer",
                  fontSize: 13, color: saveStatus === "saved" ? "var(--sage)" : "var(--ink-secondary)",
                }}
              >
                {saveStatus === "idle" ? "Save to library" : saveStatus === "saving" ? "Saving..." : "Saved ✓"}
              </button>
              <button
                onClick={copyAll}
                style={{ background: "none", border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "7px 14px", cursor: "pointer", fontSize: 13, color: "var(--ink-secondary)" }}
              >
                Copy all
              </button>
            </div>
          </div>

          <div style={{ marginBottom: 36, paddingBottom: 32, borderBottom: "1px solid var(--border)" }}>
            <div style={{ fontSize: 12, fontWeight: 500, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--sage)", marginBottom: 10 }}>
              {level} · {course}
            </div>
            <h1 style={{ fontFamily: "Georgia, serif", fontSize: 32, letterSpacing: "-0.5px", color: "var(--ink)", lineHeight: 1.2, marginBottom: 12 }}>
              {caseStudy.title}
            </h1>
            <p style={{ fontSize: 16, color: "var(--ink-secondary)", lineHeight: 1.7 }}>{caseStudy.overview}</p>
          </div>

          {[
            { label: "Background", content: caseStudy.background },
            { label: "The Challenge", content: caseStudy.challenge },
            { label: "Data & Evidence", content: caseStudy.data },
          ].map(({ label, content }) => (
            <div key={label} style={{ paddingBottom: 28, marginBottom: 28, borderBottom: "1px solid var(--border)" }}>
              <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "var(--ink)", marginBottom: 14 }}>{label}</h2>
              <p style={{ fontSize: 15, color: "var(--ink-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{content}</p>
            </div>
          ))}

          <div style={{ paddingBottom: 28, marginBottom: 28, borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "var(--ink)", marginBottom: 14 }}>Key Stakeholders</h2>
            {caseStudy.stakeholders.map((s, i) => (
              <div key={i} style={{ paddingLeft: 14, borderLeft: "2px solid var(--border)", marginBottom: 14 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: "var(--ink)", marginBottom: 3 }}>{s.name}</div>
                <div style={{ fontSize: 14, color: "var(--ink-secondary)", lineHeight: 1.6 }}>{s.role}</div>
              </div>
            ))}
          </div>

          <div style={{ paddingBottom: 28, marginBottom: 28, borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "var(--ink)", marginBottom: 14 }}>Timeline of Events</h2>
            {caseStudy.timeline.map((t, i) => (
              <div key={i} style={{ display: "flex", gap: 16, marginBottom: 14, fontSize: 14 }}>
                <span style={{ fontSize: 12, fontWeight: 500, color: "var(--ink-tertiary)", minWidth: 110, paddingTop: 2, flexShrink: 0 }}>{t.date}</span>
                <span style={{ color: "var(--ink-secondary)", lineHeight: 1.6 }}>{t.event}</span>
              </div>
            ))}
          </div>

          <div style={{ paddingBottom: 28, marginBottom: 28, borderBottom: "1px solid var(--border)" }}>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "var(--ink)", marginBottom: 14 }}>Discussion Questions</h2>
            <ol style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 12 }}>
              {caseStudy.questions.map((q, i) => (
                <li key={i} style={{ fontSize: 15, color: "var(--ink-secondary)", lineHeight: 1.6 }}>{q}</li>
              ))}
            </ol>
          </div>

          <div style={{ background: "var(--amber-light)", borderRadius: "var(--radius-lg)", padding: 24 }}>
            <div style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.8px", color: "var(--amber)", marginBottom: 6 }}>Educator only</div>
            <h2 style={{ fontFamily: "Georgia, serif", fontSize: 20, color: "var(--amber)", marginBottom: 14 }}>Teaching Notes</h2>
            <p style={{ fontSize: 15, color: "var(--ink-secondary)", lineHeight: 1.8, whiteSpace: "pre-wrap" }}>{caseStudy.teaching_notes}</p>
          </div>
        </div>
      )}
    </div>
  );
}