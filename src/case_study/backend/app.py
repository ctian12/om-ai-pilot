from flask import Flask, request, jsonify
from dotenv import load_dotenv
from openai import OpenAI
from tavily import TavilyClient
import os
import json

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))
tavily = TavilyClient(api_key=os.getenv("TAVILY_API_KEY"))

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
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

# ── ROUTES ─────────────────────────────────────────────────────────────────────

@app.route("/research", methods=["POST", "OPTIONS"])
def research():
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response, 204

    data = request.json
    concept = data.get("concept", "")
    course = data.get("course", "Supply Chain Management")
    level = data.get("level", "Undergraduate")
    date_range = data.get("date_range", "last 6 months")

    if not concept:
        return jsonify({"error": "A concept is required"}), 400

    try:
        # step 1: search the web with Tavily
        query = f"{concept} {course} real world example news {date_range}"
        search_results = tavily.search(
            query=query,
            search_depth="advanced",
            max_results=8,
            include_answer=False
        )

        results_text = "\n\n".join([
            f"Title: {r.get('title', '')}\nURL: {r.get('url', '')}\nDate: {r.get('published_date', 'unknown')}\nContent: {r.get('content', '')}"
            for r in search_results.get("results", [])
        ])

        if not results_text:
            return jsonify({"error": "No search results found. Try a different concept or date range."}), 404

        # step 2: let GPT evaluate and select the best ones
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
        return jsonify(results)

    except json.JSONDecodeError as e:
        print("JSON parse error:", e)
        return jsonify({"error": "Model returned malformed JSON"}), 500
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500


@app.route("/generate", methods=["POST", "OPTIONS"])
def generate():
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
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


if __name__ == "__main__":
    app.run(debug=True, port=5001)