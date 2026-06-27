"use client";

import { useState, useRef, useEffect } from "react";

interface Message {
  role: "user" | "assistant";
  content: string;
}

export default function TutorPage() {
  const [history, setHistory] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;

    const newHistory: Message[] = [...history, { role: "user", content: text }];
    setHistory(newHistory);
    setInput("");
    setLoading(true);

    try {
      const res = await fetch("/api/tutor", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ history: newHistory }),
      });
      const data = await res.json();
      setHistory([...newHistory, { role: "assistant", content: data.reply }]);
    } catch {
      setHistory([...newHistory, { role: "assistant", content: "Something went wrong, please try again." }]);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{
          fontFamily: "Georgia, serif",
          fontSize: 28,
          letterSpacing: "-0.5px",
          color: "var(--ink)",
          marginBottom: 6,
        }}>
          Socratic Tutor
        </h1>
        <p style={{ fontSize: 15, color: "var(--ink-secondary)", lineHeight: 1.6 }}>
          Ask a question or describe a concept you&apos;re working through. The tutor will guide you to the answer.
        </p>
      </div>

      {/* messages */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "var(--radius-lg)",
        padding: "20px",
        minHeight: 400,
        maxHeight: 500,
        overflowY: "auto",
        marginBottom: 16,
        display: "flex",
        flexDirection: "column",
        gap: 16,
      }}>
        {history.length === 0 && (
          <p style={{ fontSize: 14, color: "var(--ink-tertiary)", textAlign: "center", marginTop: 80 }}>
            Start by asking a question about your course material...
          </p>
        )}
        {history.map((msg, i) => (
          <div key={i} style={{
            display: "flex",
            justifyContent: msg.role === "user" ? "flex-end" : "flex-start",
          }}>
            <div style={{
              maxWidth: "80%",
              padding: "10px 14px",
              borderRadius: "var(--radius-lg)",
              fontSize: 14,
              lineHeight: 1.6,
              background: msg.role === "user" ? "var(--navy)" : "var(--bg)",
              color: msg.role === "user" ? "white" : "var(--ink-secondary)",
              border: msg.role === "assistant" ? "1px solid var(--border)" : "none",
            }}>
              {msg.content}
            </div>
          </div>
        ))}
        {loading && (
          <div style={{ display: "flex", justifyContent: "flex-start" }}>
            <div style={{
              padding: "10px 14px",
              borderRadius: "var(--radius-lg)",
              fontSize: 14,
              background: "var(--bg)",
              border: "1px solid var(--border)",
              color: "var(--ink-tertiary)",
            }}>
              Thinking...
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* input */}
      <div style={{ display: "flex", gap: 8 }}>
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" && !e.shiftKey) {
              e.preventDefault();
              sendMessage();
            }
          }}
          placeholder="Ask a question..."
          style={{
            flex: 1,
            padding: "10px 14px",
            fontSize: 14,
            border: "1px solid var(--border)",
            borderRadius: "var(--radius)",
            background: "var(--surface)",
            color: "var(--ink)",
            outline: "none",
          }}
        />
        <button
          onClick={sendMessage}
          disabled={loading || !input.trim()}
          style={{
            padding: "10px 20px",
            background: "var(--navy)",
            color: "white",
            border: "none",
            borderRadius: "var(--radius)",
            fontSize: 14,
            fontWeight: 500,
            cursor: loading || !input.trim() ? "not-allowed" : "pointer",
            opacity: loading || !input.trim() ? 0.5 : 1,
          }}
        >
          Send
        </button>
      </div>
    </div>
  );
}