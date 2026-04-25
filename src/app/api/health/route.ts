import { NextResponse } from "next/server";
import { env, hasSupabaseConfigured, hasTavilyConfigured, hasAnyLLMKey } from "@/lib/env";

export async function GET() {
  const tavily = env("TAVILY_API_KEY");
  return NextResponse.json({
    ok: true,
    configured: {
      supabase: hasSupabaseConfigured(),
      tavily: hasTavilyConfigured(),
      llm_any: hasAnyLLMKey(),
      groq: Boolean(env("GROQ_API_KEY"))
    },
    hints: {
      tavily_key_prefix_ok: tavily ? tavily.startsWith("tvly-") : null
    }
  });
}

