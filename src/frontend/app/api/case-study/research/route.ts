import { NextRequest } from "next/server";
import OpenAI from "openai";
import { tavily } from "@tavily/core";

const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY });

export async function POST(req: NextRequest) {
  const { concept, course, level, date_range } = await req.json();

  if (!concept) {
    return Response.json({ error: "A concept is required" }, { status: 400 });
  }

  try {
    const query = `${concept} ${course} real world example news ${date_range}`;
    const searchResponse = await tavilyClient.search(query, {
      searchDepth: "advanced",
      maxResults: 8,
    });

    const rawResults = searchResponse.results || [];
    const resultsText = rawResults.map((r) =>
      `Title: ${r.title}\nURL: ${r.url}\nDate: ${r.publishedDate || "unknown"}\nContent: ${r.content}`
    ).join("\n\n");

    if (!resultsText) {
      return Response.json({ error: "No search results found" }, { status: 404 });
    }

    const prompt = `You are an expert educator helping find real-world case study examples.

The educator wants to teach: ${concept}
Course: ${course} (${level})

Here are recent news articles found about this topic:
${resultsText}

From these results, identify the 3-5 most useful examples for a case study illustrating "${concept}".
For each, explain specifically why it illustrates the concept.

Return ONLY valid JSON, no markdown, no backticks:
{
  "concept": "${concept}",
  "articles": [
    {
      "title": "Article headline",
      "source": "Publication name",
      "date": "Date if available",
      "url": "URL",
      "summary": "2-3 sentence summary of what happened",
      "relevance": "1-2 sentences on why this illustrates ${concept}"
    }
  ]
}`;

    const response = await client.chat.completions.create({
      model: "gpt-4o",
      messages: [
        { role: "system", content: "You are a research assistant. Always respond with valid JSON only." },
        { role: "user", content: prompt },
      ],
      response_format: { type: "json_object" },
    });

    const results = JSON.parse(response.choices[0].message.content || "{}");
    results.debug_raw_results = rawResults.map((r) => ({
      title: r.title,
      url: r.url,
      date: r.publishedDate || "unknown",
      content_preview: r.content?.slice(0, 300),
    }));
    results.debug_query = query;

    return Response.json(results);
  } catch (e: unknown) {
    console.error("Research error:", e);
    return Response.json({ error: "Something went wrong" }, { status: 500 });
  }
}