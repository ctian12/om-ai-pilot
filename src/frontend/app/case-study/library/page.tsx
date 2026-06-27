"use client";

import { useState, useEffect } from "react";
import Link from "next/link";

interface CaseStudyRow {
  id: number;
  title: string;
  course: string;
  level: string;
  date_range: string;
  created_at: string;
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

interface CaseStudyDetail {
  id: number;
  title: string;
  concept: string;
  course: string;
  level: string;
  case_study: CaseStudy;
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export default function LibraryPage() {
  const [grouped, setGrouped] = useState<Record<string, CaseStudyRow[]>>({});
  const [loading, setLoading] = useState(true);
  const [renameId, setRenameId] = useState<number | null>(null);
  const [renameTitle, setRenameTitle] = useState("");
  const [viewData, setViewData] = useState<CaseStudyDetail | null>(null);

  useEffect(() => {
    loadLibrary();
  }, []);

  async function loadLibrary() {
    try {
      const res = await fetch("/api/case-study/library");
      const data = await res.json();
      setGrouped(data);
    } catch (e) {
      console.error("Failed to load library:", e);
    } finally {
      setLoading(false);
    }
  }

  async function handleDelete(id: number) {
    if (!confirm("Delete this case study? This can't be undone.")) return;
    try {
      await fetch(`/api/case-study/library/${id}`, { method: "DELETE" });
      setGrouped((prev) => {
        const updated = { ...prev };
        for (const concept in updated) {
          updated[concept] = updated[concept].filter((cs) => cs.id !== id);
          if (updated[concept].length === 0) delete updated[concept];
        }
        return updated;
      });
    } catch {
      alert("Failed to delete. Please try again.");
    }
  }

  async function handleRename() {
    if (!renameId || !renameTitle.trim()) return;
    try {
      await fetch(`/api/case-study/library/${renameId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: renameTitle.trim() }),
      });
      setGrouped((prev) => {
        const updated = { ...prev };
        for (const concept in updated) {
          updated[concept] = updated[concept].map((cs) =>
            cs.id === renameId ? { ...cs, title: renameTitle.trim() } : cs
          );
        }
        return updated;
      });
      setRenameId(null);
    } catch {
      alert("Failed to rename. Please try again.");
    }
  }

  async function handleView(id: number) {
    try {
      const res = await fetch(`/api/case-study/library/${id}`);
      const data = await res.json();
      setViewData(data);
    } catch {
      alert("Failed to load case study.");
    }
  }

  function copyAll(cs: CaseStudy, title: string) {
    const stakeholders = cs.stakeholders
      .map((s) => `  ${s.name}: ${s.role}`)
      .join("\n");
    const timeline = cs.timeline
      .map((t) => `  ${t.date} — ${t.event}`)
      .join("\n");
    const questions = cs.questions
      .map((q, i) => `  ${i + 1}. ${q}`)
      .join("\n");
    const full = [
      title, "", cs.overview, "",
      "BACKGROUND\n" + cs.background, "",
      "THE CHALLENGE\n" + cs.challenge, "",
      "KEY STAKEHOLDERS\n" + stakeholders, "",
      "TIMELINE\n" + timeline, "",
      "DATA & EVIDENCE\n" + cs.data, "",
      "DISCUSSION QUESTIONS\n" + questions, "",
      "TEACHING NOTES\n" + cs.teaching_notes,
    ].join("\n");
    navigator.clipboard.writeText(full);
  }

  const concepts = Object.keys(grouped);

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 36,
        }}
      >
        <h1
          style={{
            fontFamily: "Georgia, serif",
            fontSize: 28,
            letterSpacing: "-0.5px",
            color: "var(--ink)",
          }}
        >
          Library
        </h1>
        <Link
          href="/case-study"
          style={{
            padding: "9px 16px",
            background: "var(--navy)",
            color: "white",
            borderRadius: "var(--radius)",
            fontSize: 14,
            fontWeight: 500,
            textDecoration: "none",
          }}
        >
          + New case study
        </Link>
      </div>

      {loading && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 0",
            color: "var(--ink-tertiary)",
            fontSize: 14,
          }}
        >
          Loading...
        </div>
      )}

      {!loading && concepts.length === 0 && (
        <div
          style={{
            textAlign: "center",
            padding: "60px 24px",
            border: "1px dashed var(--border)",
            borderRadius: "var(--radius-lg)",
          }}
        >
          <p
            style={{
              fontSize: 16,
              fontWeight: 500,
              color: "var(--ink)",
              marginBottom: 8,
            }}
          >
            No saved case studies yet
          </p>
          <p
            style={{
              fontSize: 14,
              color: "var(--ink-secondary)",
              marginBottom: 24,
              lineHeight: 1.6,
            }}
          >
            Generate a case study and save it — it will appear here grouped by
            concept.
          </p>
          <Link
            href="/case-study"
            style={{
              padding: "9px 16px",
              background: "var(--navy)",
              color: "white",
              borderRadius: "var(--radius)",
              fontSize: 14,
              fontWeight: 500,
              textDecoration: "none",
            }}
          >
            Start generating
          </Link>
        </div>
      )}

      {!loading &&
        concepts.map((concept) => (
          <div key={concept} style={{ marginBottom: 36 }}>
            <div
              style={{
                fontSize: 11,
                fontWeight: 600,
                textTransform: "uppercase",
                letterSpacing: "0.8px",
                color: "var(--ink-tertiary)",
                marginBottom: 10,
                paddingBottom: 8,
                borderBottom: "1px solid var(--border)",
              }}
            >
              {concept}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {grouped[concept].map((cs) => (
                <div
                  key={cs.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 12,
                    background: "var(--surface)",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "12px 14px",
                  }}
                >
                  <div
                    style={{ flex: 1, cursor: "pointer" }}
                    onClick={() => handleView(cs.id)}
                  >
                    <div
                      style={{
                        fontSize: 14,
                        fontWeight: 500,
                        color: "var(--ink)",
                        marginBottom: 3,
                      }}
                    >
                      {cs.title}
                    </div>
                    <div
                      style={{
                        fontSize: 12,
                        color: "var(--ink-tertiary)",
                        display: "flex",
                        gap: 10,
                      }}
                    >
                      <span>{cs.course}</span>
                      <span>{cs.level}</span>
                      <span>{formatDate(cs.created_at)}</span>
                    </div>
                  </div>
                  <div style={{ display: "flex", gap: 6, flexShrink: 0 }}>
                    <a
                      href={`/api/case-study/library/${cs.id}/export`}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 12,
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "4px 10px",
                        cursor: "pointer",
                        color: "var(--ink-secondary)",
                        textDecoration: "none",
                      }}
                    >
                      PDF
                    </a>
                    <button
                      onClick={() => {
                        setRenameId(cs.id);
                        setRenameTitle(cs.title);
                      }}
                      style={{
                        fontSize: 12,
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "4px 10px",
                        cursor: "pointer",
                        color: "var(--ink-secondary)",
                      }}
                    >
                      Rename
                    </button>
                    <button
                      onClick={() => handleDelete(cs.id)}
                      style={{
                        fontSize: 12,
                        background: "none",
                        border: "1px solid var(--border)",
                        borderRadius: "var(--radius)",
                        padding: "4px 10px",
                        cursor: "pointer",
                        color: "var(--error)",
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}

      {renameId !== null && (
        <div
          onClick={() => setRenameId(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              padding: 24,
              width: "100%",
              maxWidth: 440,
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
            }}
          >
            <h3
              style={{
                fontFamily: "Georgia, serif",
                fontSize: 20,
                marginBottom: 14,
                color: "var(--ink)",
              }}
            >
              Rename case study
            </h3>
            <input
              type="text"
              value={renameTitle}
              onChange={(e) => setRenameTitle(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleRename()}
              autoFocus
              style={{
                width: "100%",
                padding: "9px 12px",
                fontSize: 14,
                border: "1px solid var(--border)",
                borderRadius: "var(--radius)",
                marginBottom: 16,
                outline: "none",
              }}
            />
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
              <button
                onClick={() => setRenameId(null)}
                style={{
                  background: "none",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--radius)",
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  color: "var(--ink-secondary)",
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleRename}
                style={{
                  background: "var(--navy)",
                  color: "white",
                  border: "none",
                  borderRadius: "var(--radius)",
                  padding: "7px 14px",
                  cursor: "pointer",
                  fontSize: 13,
                  fontWeight: 500,
                }}
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {viewData && (
        <div
          onClick={() => setViewData(null)}
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.3)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            zIndex: 100,
            padding: 24,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: "var(--surface)",
              borderRadius: "var(--radius-lg)",
              width: "100%",
              maxWidth: 720,
              maxHeight: "80vh",
              display: "flex",
              flexDirection: "column",
              boxShadow: "0 8px 32px rgba(0,0,0,0.12)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "flex-start",
                padding: "20px 24px",
                borderBottom: "1px solid var(--border)",
                flexShrink: 0,
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 12,
                    color: "var(--sage)",
                    fontWeight: 500,
                    textTransform: "uppercase",
                    letterSpacing: "0.8px",
                    marginBottom: 4,
                  }}
                >
                  {viewData.level} · {viewData.course}
                </div>
                <h2
                  style={{
                    fontFamily: "Georgia, serif",
                    fontSize: 22,
                    color: "var(--ink)",
                  }}
                >
                  {viewData.title}
                </h2>
              </div>
              <div style={{ display: "flex", gap: 8, flexShrink: 0 }}>
                <button
                  onClick={() => copyAll(viewData.case_study, viewData.title)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--ink-secondary)",
                  }}
                >
                  Copy
                </button>
                <button
                  onClick={() => setViewData(null)}
                  style={{
                    background: "none",
                    border: "1px solid var(--border)",
                    borderRadius: "var(--radius)",
                    padding: "5px 10px",
                    cursor: "pointer",
                    fontSize: 12,
                    color: "var(--ink-secondary)",
                  }}
                >
                  ✕
                </button>
              </div>
            </div>
            <div style={{ overflowY: "auto", padding: "20px 24px", flex: 1 }}>
              {[
                { label: "Overview", content: viewData.case_study.overview },
                { label: "Background", content: viewData.case_study.background },
                { label: "The Challenge", content: viewData.case_study.challenge },
                { label: "Data & Evidence", content: viewData.case_study.data },
              ].map(({ label, content }) => (
                <div
                  key={label}
                  style={{
                    marginBottom: 20,
                    paddingBottom: 20,
                    borderBottom: "1px solid var(--border)",
                  }}
                >
                  <h4
                    style={{
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "uppercase",
                      letterSpacing: "0.5px",
                      color: "var(--ink-tertiary)",
                      marginBottom: 8,
                    }}
                  >
                    {label}
                  </h4>
                  <p
                    style={{
                      fontSize: 14,
                      color: "var(--ink-secondary)",
                      lineHeight: 1.7,
                    }}
                  >
                    {content}
                  </p>
                </div>
              ))}
              <div
                style={{
                  marginBottom: 20,
                  paddingBottom: 20,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--ink-tertiary)",
                    marginBottom: 8,
                  }}
                >
                  Key Stakeholders
                </h4>
                {viewData.case_study.stakeholders.map((s, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 14,
                      color: "var(--ink-secondary)",
                      lineHeight: 1.7,
                    }}
                  >
                    <strong>{s.name}</strong> — {s.role}
                  </p>
                ))}
              </div>
              <div
                style={{
                  marginBottom: 20,
                  paddingBottom: 20,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--ink-tertiary)",
                    marginBottom: 8,
                  }}
                >
                  Timeline
                </h4>
                {viewData.case_study.timeline.map((t, i) => (
                  <p
                    key={i}
                    style={{
                      fontSize: 14,
                      color: "var(--ink-secondary)",
                      lineHeight: 1.7,
                    }}
                  >
                    <strong>{t.date}</strong> — {t.event}
                  </p>
                ))}
              </div>
              <div
                style={{
                  marginBottom: 20,
                  paddingBottom: 20,
                  borderBottom: "1px solid var(--border)",
                }}
              >
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--ink-tertiary)",
                    marginBottom: 8,
                  }}
                >
                  Discussion Questions
                </h4>
                <ol
                  style={{
                    paddingLeft: 18,
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {viewData.case_study.questions.map((q, i) => (
                    <li
                      key={i}
                      style={{
                        fontSize: 14,
                        color: "var(--ink-secondary)",
                        lineHeight: 1.6,
                      }}
                    >
                      {q}
                    </li>
                  ))}
                </ol>
              </div>
              <div
                style={{
                  background: "var(--amber-light)",
                  borderRadius: "var(--radius)",
                  padding: 14,
                }}
              >
                <h4
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    textTransform: "uppercase",
                    letterSpacing: "0.5px",
                    color: "var(--amber)",
                    marginBottom: 8,
                  }}
                >
                  Teaching Notes
                </h4>
                <p
                  style={{
                    fontSize: 14,
                    color: "var(--ink-secondary)",
                    lineHeight: 1.7,
                  }}
                >
                  {viewData.case_study.teaching_notes}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
