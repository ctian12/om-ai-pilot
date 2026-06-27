import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "CaseGen",
  description: "AI-powered case study generator for educators",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <header style={{
          background: "var(--surface)",
          borderBottom: "1px solid var(--border)",
          position: "sticky",
          top: 0,
          zIndex: 10,
        }}>
          <div style={{
            maxWidth: 720,
            margin: "0 auto",
            padding: "0 24px",
            height: 56,
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}>
            <Link href="/" style={{
              fontFamily: "Georgia, serif",
              fontSize: 20,
              color: "var(--navy)",
              textDecoration: "none",
              fontWeight: 600,
            }}>
              CaseGen
            </Link>
            <nav style={{ display: "flex", gap: 4 }}>
              <Link href="/tutor" style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink-secondary)",
                textDecoration: "none",
                padding: "5px 10px",
                borderRadius: "var(--radius)",
              }}>
                Tutor
              </Link>
              <Link href="/case-study" style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink-secondary)",
                textDecoration: "none",
                padding: "5px 10px",
                borderRadius: "var(--radius)",
              }}>
                Case Study
              </Link>
              <Link href="/case-study/library" style={{
                fontSize: 13,
                fontWeight: 500,
                color: "var(--ink-secondary)",
                textDecoration: "none",
                padding: "5px 10px",
                borderRadius: "var(--radius)",
              }}>
                Library
              </Link>
            </nav>
          </div>
        </header>
        <main style={{ maxWidth: 720, margin: "0 auto", padding: "48px 24px 80px" }}>
          {children}
        </main>
      </body>
    </html>
  );
}