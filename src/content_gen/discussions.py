from api_client import get_openai_client

def generate_mini_case(weekly_topic):
    """
    Generates a short vignette (150-300 words) for Blackboard discussion boards[cite: 12].
    """
    client = get_openai_client()
    
    prompt = f"Create a 250-word real-world mini-case study regarding {weekly_topic}. " \
             f"End with a controversial question to spark student engagement[cite: 12]."

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

def generate_debate_prompts(topic):
    """
    Generates structured prompts and counterarguments for OM topics[cite: 13].
    """
    client = get_openai_client()
    
    prompt = f"Generate a structured debate outline for the OM topic: {topic}. " \
             f"Provide a 'Pro' stance, a 'Con' stance, and a rebuttal for each[cite: 13]."

    response = client.chat.completions.create(
        model="gpt-4o",
        messages=[{"role": "system", "content": "You are a debate moderator specialized in Operations."},
                  {"role": "user", "content": prompt}]
    )
    return response.choices[0].message.content

if __name__ == "__main__":
    print("--- MINI CASE ---")
    print(generate_mini_case("Just-In-Time Inventory"))