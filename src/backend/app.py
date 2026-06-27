from flask import Flask
from dotenv import load_dotenv
from routes.tutor import tutor_bp
from routes.case_study import case_study_bp

load_dotenv()

app = Flask(__name__)

@app.after_request
def add_cors_headers(response):
    response.headers['Access-Control-Allow-Origin'] = '*'
    response.headers['Access-Control-Allow-Headers'] = 'Content-Type'
    response.headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS'
    return response

app.register_blueprint(tutor_bp, url_prefix="/tutor")
app.register_blueprint(case_study_bp, url_prefix="/case-study")

if __name__ == "__main__":
    app.run(debug=True, port=5000)