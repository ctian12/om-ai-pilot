import os
from dotenv import load_dotenv
from openai import OpenAI
import google.generativeai as genai

# Load variables from .env file
load_dotenv()

def get_openai_client():
    """
    Initializes and returns the OpenAI client using the API key 
    funded by the Small Grant ($700 allocation).
    """
    api_key = os.getenv("OPENAI_API_KEY")
    if not api_key:
        raise ValueError("OPENAI_API_KEY not found in .env file.")
    return OpenAI(api_key=api_key)

def get_gemini_model():
    """
    Initializes and returns the Gemini model for cross-checking 
    content quality and diversifying model access.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise ValueError("GEMINI_API_KEY not found in .env file.")
    
    genai.configure(api_key=api_key)
    # Using 'gemini-1.5-pro' or similar based on 2026 availability
    return genai.GenerativeModel('gemini-1.5-pro')

def get_perplexity_key():
    """
    Returns the Perplexity key for structured access to current 
    real-world supply chain data.
    """
    api_key = os.getenv("PERPLEXITY_API_KEY")
    if not api_key:
        print("Warning: PERPLEXITY_API_KEY not found.")
    return api_key