import Link from "next/link";

export default function Home() {
  return (
    <div>
      <h1 style={{
        fontFamily: "Georgia, serif",
        fontSize: 36,
        letterSpacing: "-0.5px",
        color: "var(--ink)",
        marginBottom: 12,
      }}>
        Welcome to CaseGen
      </h1>
      <p style={{
        fontSize: 16,
        color: "var(--ink-secondary)",
        lineHeight: 1.7,
        marginBottom: 40,
        maxWidth: 520,
      }}>
        AI-powered tools for operations management education. Generate current, relevant case studies from real news, or get guided help from a Socratic tutor.
      </p>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
        <Link href="/case-study" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            cursor: "pointer",
            transition: "border-color 0.15s",
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "var(--sage)",
              marginBottom: 8,
            }}>
              Case Study Generator
            </div>
            <h2 style={{
              fontFamily: "Georgia, serif",
              fontSize: 20,
              color: "var(--ink)",
              marginBottom: 8,
            }}>
              Generate a case study
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
              Find real-world examples of SCM concepts from recent news and turn them into structured educational case studies.
            </p>
          </div>
        </Link>

        <Link href="/tutor" style={{ textDecoration: "none" }}>
          <div style={{
            background: "var(--surface)",
            border: "1px solid var(--border)",
            borderRadius: "var(--radius-lg)",
            padding: "24px",
            cursor: "pointer",
          }}>
            <div style={{
              fontSize: 11,
              fontWeight: 600,
              textTransform: "uppercase",
              letterSpacing: "0.8px",
              color: "var(--sage)",
              marginBottom: 8,
            }}>
              Socratic Tutor
            </div>
            <h2 style={{
              fontFamily: "Georgia, serif",
              fontSize: 20,
              color: "var(--ink)",
              marginBottom: 8,
            }}>
              Get guided help
            </h2>
            <p style={{ fontSize: 14, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
              Work through problems with an AI tutor that guides you to answers rather than giving them directly.
            </p>
          </div>
        </Link>
      </div>
    </div>
  );
}