import os
from api_client import get_openai_client

def generate_full_case(topic, industry="Manufacturing"):
    """
    Generates a multi-page, data-rich Operations Management case study.
    Targets contemporary supply chain challenges.
    """
    client = get_openai_client()
    
    prompt = f"""
    Write a comprehensive Operations Management case study about {topic} in the {industry} sector.
    The case should include:
    1. Executive Summary
    2. Company Background
    3. The specific Operational Challenge (e.g., bottlenecks, bullwhip effect)
    4. A data table with hypothetical monthly performance metrics (Lead times, Inventory levels)
    5. Three discussion questions for students.
    
    Style: Professional, academic, and suitable for a core OM course[cite: 5, 11].
    """

    response = client.chat.completions.create(
        model="gpt-4o", # Or your preferred model
        messages=[{"role": "system", "content": "You are an expert Operations Management professor."},
                  {"role": "user", "content": prompt}]
    )
    
    return response.choices[0].message.content

if __name__ == "__main__":
    # Example usage for testing
    case_content = generate_full_case("Global Supply Chain Disruption", "Automotive")
    print(case_content)