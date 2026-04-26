import { NextResponse } from "next/server";
import { env, hasSupabaseConfigured, hasTavilyConfigured, hasAnyLLMKey } from "@/lib/env";

export async function GET() {
  const tavily = env("TAVILY_API_KEY");
  const supaUrl = env("NEXT_PUBLIC_SUPABASE_URL");
  const supaAnon = env("NEXT_PUBLIC_SUPABASE_ANON_KEY") ?? env("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY");
  const supaService = env("SUPABASE_SERVICE_ROLE_KEY");
  const useProvider = env("USE_PROVIDER") ?? null;
  return NextResponse.json({
    ok: true,
    configured: {
      supabase: hasSupabaseConfigured(),
      supabase_admin: Boolean(supaUrl && supaService),
      supabase_anon: Boolean(supaUrl && supaAnon),
      tavily: hasTavilyConfigured(),
      llm_any: hasAnyLLMKey(),
      groq: Boolean(env("GROQ_API_KEY")),
      openrouter: Boolean(env("OPENROUTER_API_KEY")),
      openai: Boolean(env("OPENAI_API_KEY")),
      ollama: Boolean(env("OLLAMA_BASE_URL"))
    },
    debug: {
      supabase_url_present: Boolean(supaUrl),
      supabase_anon_key_present: Boolean(supaAnon),
      supabase_service_key_present: Boolean(supaService),
      supabase_service_key_prefix: supaService ? supaService.slice(0, 8) : null,
      use_provider: useProvider,
      openrouter_model: env("OPENROUTER_MODEL") ?? null,
      groq_model: env("GROQ_MODEL") ?? null
    },
    hints: {
      tavily_key_prefix_ok: tavily ? tavily.startsWith("tvly-") : null
    }
  });
}

