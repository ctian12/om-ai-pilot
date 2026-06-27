from flask import Blueprint, request, jsonify, send_file
from openai import OpenAI
from tavily import TavilyClient
from reportlab.lib.pagesizes import letter
from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, ListFlowable, ListItem
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.lib.units import inch
from reportlab.lib import colors
import os
import json
import sqlite3
import io
from datetime import datetime
from prompts import RESEARCH_PROMPT, GENERATE_PROMPT
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

case_study_bp = Blueprint("case_study", __name__)

# ── DATABASE ───────────────────────────────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(__file__), "..", "case_studies.db")

def get_db():
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    return conn

def init_db():
    conn = get_db()
    conn.execute("""
        CREATE TABLE IF NOT EXISTS case_studies (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            title       TEXT NOT NULL,
            concept     TEXT NOT NULL,
            course      TEXT NOT NULL,
            level       TEXT NOT NULL,
            date_range  TEXT,
            articles    TEXT,
            objectives  TEXT,
            case_study  TEXT,
            created_at  TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at  TEXT DEFAULT CURRENT_TIMESTAMP
        )
    """)
    conn.commit()
    conn.close()

init_db()

# ── RESEARCH ───────────────────────────────────────────────────────────────────

@case_study_bp.route("/research", methods=["POST", "OPTIONS"])
def research():
    if request.method == "OPTIONS":
        return jsonify({}), 204

    data = request.json
    concept = data.get("concept", "")
    course = data.get("course", "Supply Chain Management")
    level = data.get("level", "Undergraduate")
    date_range = data.get("date_range", "last 6 months")

    if not concept:
        return jsonify({"error": "A concept is required"}), 400

    try:
        query = f"{concept} {course} real world example news {date_range}"
        search_results = tavily.search(
            query=query,
            search_depth="advanced",
            max_results=8,
            include_answer=False
        )

        raw_results = search_results.get("results", [])
        results_text = "\n\n".join([
            f"Title: {r.get('title', '')}\nURL: {r.get('url', '')}\nDate: {r.get('published_date', 'unknown')}\nContent: {r.get('content', '')}"
            for r in raw_results
        ])

        if not results_text:
            return jsonify({"error": "No search results found. Try a different concept or date range."}), 404

        prompt = RESEARCH_PROMPT.format(
            concept=concept,
            course=course,
            level=level,
            search_results=results_text
        )

        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are a research assistant. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        results = json.loads(raw)

        results["debug_raw_results"] = [
            {
                "title": r.get("title", ""),
                "url": r.get("url", ""),
                "date": r.get("published_date", "unknown"),
                "content_preview": r.get("content", "")[:300]
            }
            for r in raw_results
        ]
        results["debug_query"] = query

        return jsonify(results)

    except json.JSONDecodeError as e:
        print("JSON parse error:", e)
        return jsonify({"error": "Model returned malformed JSON"}), 500
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

# ── GENERATE ───────────────────────────────────────────────────────────────────

@case_study_bp.route("/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        return jsonify({}), 204

    data = request.json
    articles = data.get("articles", [])
    course = data.get("course", "Supply Chain Management")
    level = data.get("level", "Undergraduate")
    objectives = data.get("objectives", [])
    extra = data.get("extra", "")

    if not articles:
        return jsonify({"error": "At least one article is required"}), 400
    if not course:
        return jsonify({"error": "Course name is required"}), 400

    articles_text = "\n\n---\n\n".join(
        f"Article {i+1}:\n{a}" for i, a in enumerate(articles)
    )
    objectives_text = "\n".join(
        f"{i+1}. {o}" for i, o in enumerate(objectives)
    ) if objectives else "Infer appropriate objectives from the source material and course context."
    extra_text = f"ADDITIONAL INSTRUCTIONS:\n{extra}" if extra else ""

    prompt = GENERATE_PROMPT.format(
        level=level,
        course=course,
        articles=articles_text,
        objectives=objectives_text,
        extra=extra_text
    )

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[
                {"role": "system", "content": "You are an expert educational case study writer. Always respond with valid JSON only."},
                {"role": "user", "content": prompt}
            ],
            response_format={"type": "json_object"}
        )
        raw = response.choices[0].message.content.strip()
        case_study = json.loads(raw)
        return jsonify(case_study)

    except json.JSONDecodeError as e:
        print("JSON parse error:", e)
        return jsonify({"error": "Model returned malformed JSON"}), 500
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

# ── LIBRARY ────────────────────────────────────────────────────────────────────

@case_study_bp.route("/library", methods=["GET", "POST", "OPTIONS"])
def library():
    if request.method == "OPTIONS":
        return jsonify({}), 204

    if request.method == "POST":
        data = request.json
        concept = data.get("concept", "")
        course = data.get("course", "")
        title = data.get("title", "")

        if not title or not concept or not course:
            return jsonify({"error": "title, concept, and course are required"}), 400

        try:
            conn = get_db()
            cursor = conn.execute("""
                INSERT INTO case_studies
                    (title, concept, course, level, date_range, articles, objectives, case_study)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                title,
                concept,
                course,
                data.get("level", ""),
                data.get("date_range", ""),
                json.dumps(data.get("articles", [])),
                json.dumps(data.get("objectives", [])),
                json.dumps(data.get("case_study", {}))
            ))
            conn.commit()
            new_id = cursor.lastrowid
            conn.close()
            return jsonify({"id": new_id, "message": "Saved successfully"})
        except Exception as e:
            print("Error:", e)
            return jsonify({"error": str(e)}), 500

    if request.method == "GET":
        try:
            conn = get_db()
            rows = conn.execute("""
                SELECT id, title, concept, course, level, date_range, created_at
                FROM case_studies
                ORDER BY concept ASC, created_at DESC
            """).fetchall()
            conn.close()

            grouped = {}
            for row in rows:
                concept = row["concept"]
                if concept not in grouped:
                    grouped[concept] = []
                grouped[concept].append({
                    "id": row["id"],
                    "title": row["title"],
                    "course": row["course"],
                    "level": row["level"],
                    "date_range": row["date_range"],
                    "created_at": row["created_at"]
                })

            return jsonify(grouped)
        except Exception as e:
            print("Error:", e)
            return jsonify({"error": str(e)}), 500


@case_study_bp.route("/library/<int:id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
def library_item(id):
    if request.method == "OPTIONS":
        return jsonify({}), 204

    if request.method == "GET":
        try:
            conn = get_db()
            row = conn.execute("SELECT * FROM case_studies WHERE id = ?", (id,)).fetchone()
            conn.close()
            if not row:
                return jsonify({"error": "Not found"}), 404
            return jsonify({
                "id": row["id"],
                "title": row["title"],
                "concept": row["concept"],
                "course": row["course"],
                "level": row["level"],
                "date_range": row["date_range"],
                "articles": json.loads(row["articles"] or "[]"),
                "objectives": json.loads(row["objectives"] or "[]"),
                "case_study": json.loads(row["case_study"] or "{}"),
                "created_at": row["created_at"]
            })
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "PUT":
        data = request.json
        new_title = data.get("title", "").strip()
        if not new_title:
            return jsonify({"error": "Title is required"}), 400
        try:
            conn = get_db()
            conn.execute(
                "UPDATE case_studies SET title = ?, updated_at = ? WHERE id = ?",
                (new_title, datetime.utcnow().isoformat(), id)
            )
            conn.commit()
            conn.close()
            return jsonify({"message": "Updated successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

    if request.method == "DELETE":
        try:
            conn = get_db()
            conn.execute("DELETE FROM case_studies WHERE id = ?", (id,))
            conn.commit()
            conn.close()
            return jsonify({"message": "Deleted successfully"})
        except Exception as e:
            return jsonify({"error": str(e)}), 500

# ── PDF EXPORT ─────────────────────────────────────────────────────────────────

def build_case_study_pdf(record):
    buffer = io.BytesIO()
    doc = SimpleDocTemplate(
        buffer, pagesize=letter,
        topMargin=0.75*inch, bottomMargin=0.75*inch,
        leftMargin=0.85*inch, rightMargin=0.85*inch
    )

    styles = getSampleStyleSheet()
    styles.add(ParagraphStyle(name='CSTitle', fontSize=20, leading=26, spaceAfter=6, fontName='Helvetica-Bold'))
    styles.add(ParagraphStyle(name='CSMeta', fontSize=10, textColor=colors.HexColor('#5A5A56'), spaceAfter=18))
    styles.add(ParagraphStyle(name='CSOverview', fontSize=11, leading=16, textColor=colors.HexColor('#333333'), spaceAfter=20))
    styles.add(ParagraphStyle(name='CSHeading', fontSize=14, leading=18, spaceBefore=16, spaceAfter=8, fontName='Helvetica-Bold', textColor=colors.HexColor('#1B3A5C')))
    styles.add(ParagraphStyle(name='CSBody', fontSize=10.5, leading=16, textColor=colors.HexColor('#333333'), spaceAfter=8))
    styles.add(ParagraphStyle(name='CSStakeholder', fontSize=10.5, leading=15, spaceAfter=6))
    styles.add(ParagraphStyle(name='CSNotesHeading', fontSize=12, leading=16, spaceBefore=4, fontName='Helvetica-Bold', textColor=colors.HexColor('#C4852A')))

    cs = json.loads(record["case_study"] or "{}")
    story = []

    story.append(Paragraph(cs.get("title", "Untitled Case Study"), styles['CSTitle']))
    story.append(Paragraph(f"{record['level']} &middot; {record['course']}", styles['CSMeta']))
    story.append(Paragraph(cs.get("overview", ""), styles['CSOverview']))

    if cs.get("background"):
        story.append(Paragraph("Background", styles['CSHeading']))
        story.append(Paragraph(cs["background"].replace("\n", "<br/>"), styles['CSBody']))

    if cs.get("challenge"):
        story.append(Paragraph("The Challenge", styles['CSHeading']))
        story.append(Paragraph(cs["challenge"].replace("\n", "<br/>"), styles['CSBody']))

    if cs.get("stakeholders"):
        story.append(Paragraph("Key Stakeholders", styles['CSHeading']))
        for s in cs["stakeholders"]:
            story.append(Paragraph(f"<b>{s.get('name','')}</b> — {s.get('role','')}", styles['CSStakeholder']))

    if cs.get("timeline"):
        story.append(Paragraph("Timeline of Events", styles['CSHeading']))
        for t in cs["timeline"]:
            story.append(Paragraph(f"<b>{t.get('date','')}</b> — {t.get('event','')}", styles['CSStakeholder']))

    if cs.get("data"):
        story.append(Paragraph("Data &amp; Evidence", styles['CSHeading']))
        story.append(Paragraph(cs["data"].replace("\n", "<br/>"), styles['CSBody']))

    if cs.get("questions"):
        story.append(Paragraph("Discussion Questions", styles['CSHeading']))
        items = [ListItem(Paragraph(q, styles['CSBody']), spaceAfter=6) for q in cs["questions"]]
        story.append(ListFlowable(items, bulletType='1', start=1))

    if cs.get("teaching_notes"):
        story.append(Spacer(1, 16))
        story.append(Paragraph("Teaching Notes (Educator Only)", styles['CSNotesHeading']))
        story.append(Paragraph(cs["teaching_notes"].replace("\n", "<br/>"), styles['CSBody']))

    doc.build(story)
    buffer.seek(0)
    return buffer


@case_study_bp.route("/library/<int:id>/export", methods=["GET"])
def export_pdf(id):
    try:
        conn = get_db()
        row = conn.execute("SELECT * FROM case_studies WHERE id = ?", (id,)).fetchone()
        conn.close()

        if not row:
            return jsonify({"error": "Not found"}), 404

        pdf_buffer = build_case_study_pdf(row)
        safe_filename = "".join(c if c.isalnum() or c in " -_" else "" for c in row["title"])[:60]

        return send_file(
            pdf_buffer,
            mimetype="application/pdf",
            as_attachment=True,
            download_name=f"{safe_filename or 'case_study'}.pdf"
        )
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500