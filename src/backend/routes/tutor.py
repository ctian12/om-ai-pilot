from flask import Blueprint, request, jsonify
from openai import OpenAI
import os
from prompts import TUTOR_SYSTEM_PROMPT
from dotenv import load_dotenv
load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

tutor_bp = Blueprint("tutor", __name__)

@tutor_bp.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        return jsonify({}), 204

    data = request.json
    history = data.get("history", [])

    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": TUTOR_SYSTEM_PROMPT}] + history
        )
        reply = response.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500