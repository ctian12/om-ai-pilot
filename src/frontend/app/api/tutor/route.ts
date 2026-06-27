import { NextRequest } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

const SYSTEM_PROMPT = `You are a Socratic tutor. Your job is to help students learn by guiding them to answers themselves — never by giving the answer directly. When a student asks a question or shares a problem:
- Ask one focused guiding question to nudge their thinking
- If they're stuck, break the problem into a smaller first step and ask about that
- If their answer is wrong, don't tell them — ask a question that helps them spot the error
- If they ask you to just give the answer, decline warmly and offer a hint instead
- Keep responses short: 2-4 sentences, always ending with a question.
Be encouraging and patient. Assume the student is capable of figuring it out.`;

export async function POST(req: NextRequest) {
  const { history } = await req.json();

  if (!history) {
    return Response.json({ error: "History is required" }, { status: 400 });
  }

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [{ role: "system", content: SYSTEM_PROMPT }, ...history],
    });
    const reply = response.choices[0].message.content;
    return Response.json({ reply });
  } catch (e: unknown) {
    console.error("Tutor error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}