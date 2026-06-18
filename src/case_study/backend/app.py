from flask import Flask, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI
from tavily import TavilyClient
import os
import json
import sqlite3
from datetime import datetime

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

app = Flask(__name__)

# ── DATABASE ───────────────────────────────────────────────────────────────────

DB_PATH = os.path.join(os.path.dirname(__file__), "case_studies.db")

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

# ── CORS ───────────────────────────────────────────────────────────────────────

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

# ── PROMPTS ────────────────────────────────────────────────────────────────────

RESEARCH_PROMPT = """You are an expert educator helping find real-world case study examples.

The educator wants to teach: {concept}
Course: {course} ({level})

Here are recent news articles found about this topic:
{search_results}

From these results, identify the 3-5 most useful examples for a case study illustrating "{concept}".
For each, explain specifically why it illustrates the concept.

Return ONLY valid JSON, no markdown, no backticks:
{{
  "concept": "{concept}",
  "articles": [
    {{
      "title": "Article headline",
      "source": "Publication name",
      "date": "Date if available",
      "url": "URL",
      "summary": "2-3 sentence summary of what happened",
      "relevance": "1-2 sentences on why this illustrates {concept}"
    }}
  ]
}}"""

GENERATE_PROMPT = """You are an expert educational case study writer. Generate a complete, rigorous case study for a {level} {course} course.

SOURCE MATERIAL:
{articles}

LEARNING OBJECTIVES:
{objectives}

{extra}

Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation. Use this exact structure:
{{
  "title": "Compelling case study title",
  "overview": "2-3 sentence synopsis",
  "background": "Detailed background on the company, industry, and situation before the problem emerged (3-5 paragraphs)",
  "challenge": "The core challenge or decision at hand, framed around {course} concepts (2-3 paragraphs)",
  "stakeholders": [
    {{"name": "Stakeholder name or group", "role": "Their role and interests"}}
  ],
  "timeline": [
    {{"date": "Date or time period", "event": "What happened"}}
  ],
  "data": "Key data points, statistics, and evidence drawn from the source material",
  "questions": [
    "Discussion question 1",
    "Discussion question 2",
    "Discussion question 3",
    "Discussion question 4",
    "Discussion question 5"
  ],
  "teaching_notes": "Suggested facilitation approach, concept connections, and possible answers for the educator only"
}}"""

# ── RESEARCH ───────────────────────────────────────────────────────────────────

@app.route("/research", methods=["POST", "OPTIONS"])
def research():
    if request.method == "OPTIONS":
        response = jsonify({})
        return response, 204

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

@app.route("/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        response = jsonify({})
        return response, 204

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

# ── LIBRARY: SAVE ──────────────────────────────────────────────────────────────

@app.route("/library", methods=["GET", "POST", "OPTIONS"])
def library():
    if request.method == "OPTIONS":
        response = jsonify({})
        return response, 204

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

    # GET — return all case studies grouped by concept
    if request.method == "GET":
        try:
            conn = get_db()
            rows = conn.execute("""
                SELECT id, title, concept, course, level, date_range, created_at
                FROM case_studies
                ORDER BY concept ASC, created_at DESC
            """).fetchall()
            conn.close()

            # group by concept
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

# ── LIBRARY: SINGLE RECORD ─────────────────────────────────────────────────────

@app.route("/library/<int:id>", methods=["GET", "PUT", "DELETE", "OPTIONS"])
def library_item(id):
    if request.method == "OPTIONS":
        response = jsonify({})
        return response, 204

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

if __name__ == "__main__":
    app.run(debug=True, port=5001)