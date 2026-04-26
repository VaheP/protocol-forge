import { env } from "@/lib/env";
import type { TavilyResult } from "@/lib/tavily";

const EXTRACT_PROMPT = (content: string) =>
  `Extract the abstract and methods/methodology sections from the scientific text below.
- If labelled sections are present, return only those.
- If not, return the most relevant scientific excerpt describing what was studied, how, and what was found.
- Plain text only. No labels, headers, or markdown. Max 300 words.

"""
${content}
"""`.trim();

async function extractFromGroq(content: string): Promise<string> {
  const apiKey = env("GROQ_API_KEY");
  if (!apiKey) return content;

  const model = env("GROQ_EXTRACT_MODEL") ?? "llama-3.1-8b-instant";

  try {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        messages: [{ role: "user", content: EXTRACT_PROMPT(content.slice(0, 3000)) }],
        temperature: 0,
        max_tokens: 450,
      }),
    });

    if (!res.ok) return content;
    const json = await res.json();
    return json.choices?.[0]?.message?.content?.trim() ?? content;
  } catch {
    return content;
  }
}

export async function extractRelevantSections(results: TavilyResult[]): Promise<TavilyResult[]> {
  return Promise.all(
    results.map(async (r) => {
      const raw = (r.content ?? r.snippet ?? "").trim();
      if (!raw) return r;
      const extracted = await extractFromGroq(raw);
      return { ...r, snippet: extracted, content: extracted };
    })
  );
}
