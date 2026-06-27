import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET() {
  try {
    const db = getDb();
    const rows = db.prepare(`
      SELECT id, title, concept, course, level, date_range, created_at
      FROM case_studies
      ORDER BY concept ASC, created_at DESC
    `).all() as {
      id: number;
      title: string;
      concept: string;
      course: string;
      level: string;
      date_range: string;
      created_at: string;
    }[];

    const grouped: Record<string, typeof rows> = {};
    for (const row of rows) {
      if (!grouped[row.concept]) grouped[row.concept] = [];
      grouped[row.concept].push(row);
    }

    return Response.json(grouped);
  } catch (e: unknown) {
    console.error("Library GET error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  const { title, concept, course, level, date_range, articles, objectives, case_study } = await req.json();

  if (!title || !concept || !course) {
    return Response.json({ error: "title, concept, and course are required" }, { status: 400 });
  }

  try {
    const db = getDb();
    const result = db.prepare(`
      INSERT INTO case_studies (title, concept, course, level, date_range, articles, objectives, case_study)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      title, concept, course, level, date_range,
      JSON.stringify(articles || []),
      JSON.stringify(objectives || []),
      JSON.stringify(case_study || {})
    );

    return Response.json({ id: result.lastInsertRowid, message: "Saved successfully" });
  } catch (e: unknown) {
    console.error("Library POST error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}