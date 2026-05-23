from flask import Flask, request, jsonify
from dotenv import load_dotenv
import os

load_dotenv()

from openai import OpenAI

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

app = Flask(__name__)

SYSTEM_PROMPT = "You are a Socratic tutor. Your job is to help students learn by guiding them to answers themselves — never by giving the answer directly. When a student asks a question or shares a problem: - Ask one focused guiding question to nudge their thinking - If they're stuck, break the problem into a smaller first step and ask about that - If their answer is wrong, don't tell them — ask a question that helps them spot the error - If they ask you to just give the answer, decline warmly and offer a hint instead - Keep responses short: 2-4 sentences, always ending with a question. Be encouraging and patient. Assume the student is capable of figuring it out." # we'll fill this in later

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
    return response

@app.route("/chat", methods=["POST", "OPTIONS"])
def chat():
    if request.method == "OPTIONS":
        response = jsonify({})
        response.headers['Access-Control-Allow-Origin'] = '*'
        response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
        response.headers['Access-Control-Allow-Methods'] = 'POST, OPTIONS'
        return response, 204
    
    print("Request received")
    data = request.json
    history = data.get("history", [])
    print("History:", history)
    
    try:
        response = client.chat.completions.create(
            model="gpt-4o",
            messages=[{"role": "system", "content": SYSTEM_PROMPT}] + history
        )
        print("Got response from OpenAI")
        reply = response.choices[0].message.content
        return jsonify({"reply": reply})
    except Exception as e:
        print("Error:", e)
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True)