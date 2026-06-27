import { NextRequest } from "next/server";
import { getDb } from "@/lib/db";

export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    const row = db.prepare("SELECT * FROM case_studies WHERE id = ?").get(Number(id)) as Record<string, unknown> | undefined;
    if (!row) return Response.json({ error: "Not found" }, { status: 404 });

    return Response.json({
      ...row,
      articles: JSON.parse((row.articles as string) || "[]"),
      objectives: JSON.parse((row.objectives as string) || "[]"),
      case_study: JSON.parse((row.case_study as string) || "{}"),
    });
  } catch (e: unknown) {
    console.error("Library GET id error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function PUT(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { title } = await req.json();
  if (!title?.trim()) return Response.json({ error: "Title is required" }, { status: 400 });

  try {
    const db = getDb();
    db.prepare("UPDATE case_studies SET title = ?, updated_at = ? WHERE id = ?")
      .run(title.trim(), new Date().toISOString(), Number(id));
    return Response.json({ message: "Updated successfully" });
  } catch (e: unknown) {
    console.error("Library PUT error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  try {
    const db = getDb();
    db.prepare("DELETE FROM case_studies WHERE id = ?").run(Number(id));
    return Response.json({ message: "Deleted successfully" });
  } catch (e: unknown) {
    console.error("Library DELETE error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}