export function env(name: string): string | undefined {
  const v = process.env[name];
  if (!v) return undefined;
  const trimmed = v.trim();
  return trimmed.length ? trimmed : undefined;
}

export function hasAnyLLMKey() {
  return Boolean(env("OPENAI_API_KEY") || env("GROQ_API_KEY") || env("OPENROUTER_API_KEY") || env("OLLAMA_BASE_URL"));
}

export function hasSupabaseConfigured() {
  return Boolean(
    env("NEXT_PUBLIC_SUPABASE_URL") &&
      env("NEXT_PUBLIC_SUPABASE_ANON_KEY") &&
      env("SUPABASE_SERVICE_ROLE_KEY")
  );
}

export function hasTavilyConfigured() {
  return Boolean(env("TAVILY_API_KEY"));
}

