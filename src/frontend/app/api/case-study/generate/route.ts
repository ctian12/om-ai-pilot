import { NextRequest } from "next/server";
import OpenAI from "openai";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

export async function POST(req: NextRequest) {
  const { articles, course, level, objectives, extra } = await req.json();

  if (!articles?.length) {
    return Response.json({ error: "At least one article is required" }, { status: 400 });
  }
  if (!course) {
    return Response.json({ error: "Course name is required" }, { status: 400 });
  }

  const articlesText = articles.map((a: string, i: number) =>
    `Article ${i + 1}:\n${a}`
  ).join("\n\n---\n\n");

  const objectivesText = objectives?.length
    ? objectives.map((o: string, i: number) => `${i + 1}. ${o}`).join("\n")
    : "Infer appropriate objectives from the source material and course context.";

  const extraText = extra ? `ADDITIONAL INSTRUCTIONS:\n${extra}` : "";

  const prompt = `You are an expert educational case study writer. Generate a complete, rigorous case study for a ${level} ${course} course.

SOURCE MATERIAL:
${articlesText}

LEARNING OBJECTIVES:
${objectivesText}

${extraText}

Respond ONLY with a valid JSON object, no markdown, no backticks, no explanation. Use this exact structure:
{
  "title": "Compelling case study title",
  "overview": "2-3 sentence synopsis",
  "background": "Detailed background on the company, industry, and situation before the problem emerged (3-5 paragraphs)",
  "challenge": "The core challenge or decision at hand, framed around ${course} concepts (2-3 paragraphs)",
  "stakeholders": [
    {"name": "Stakeholder name or group", "role": "Their role and interests"}
  ],
  "timeline": [
    {"date": "Date or time period", "event": "What happened"}
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
}`;

  try {
    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are an expert educational case study writer. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const caseStudy = JSON.parse(response.choices[0].message.content || "{}");
    return Response.json(caseStudy);
  } catch (e: unknown) {
    console.error("Generate error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}