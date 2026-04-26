import { tavilySearch, type TavilyResult } from "@/lib/tavily";

export type RequiredMaterial = {
  item_name: string;
  intended_use: string;
  preferred_supplier_hint: string;
  search_query: string;
};

export type PriceQuote = {
  vendor: string | null;
  price: number | null;
  currency: string | null;
  pack_size: string | null;
  url: string | null;
  retrieved_at: string;
  confidence: number; // 0..1
  evidence: string | null;
};

export type PricingContext = Record<
  string,
  {
    query: string;
    results: TavilyResult[];
    quotes: PriceQuote[];
  }
>;

function extractQuotesFromText(text: string, url?: string, title?: string): PriceQuote[] {
  const t = (text ?? "").replace(/\s+/g, " ").trim();
  if (!t) return [];

  // Simple currency parsing (best-effort; we keep confidence low unless very explicit).
  const patterns: Array<{ re: RegExp; currency: string }> = [
    { re: /\$\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/g, currency: "USD" },
    { re: /USD\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/gi, currency: "USD" },
    { re: /€\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/g, currency: "EUR" },
    { re: /EUR\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/gi, currency: "EUR" },
    { re: /£\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/g, currency: "GBP" },
    { re: /GBP\s*([0-9]{1,6}(?:\.[0-9]{1,2})?)/gi, currency: "GBP" }
  ];

  const vendor =
    title?.split(" - ")[0]?.slice(0, 80) ??
    (url ? new URL(url).hostname.replace(/^www\./, "") : null);

  const out: PriceQuote[] = [];
  for (const { re, currency } of patterns) {
    for (const m of t.matchAll(re)) {
      const raw = m[1];
      const price = raw ? Number(raw) : NaN;
      if (!Number.isFinite(price) || price <= 0) continue;
      out.push({
        vendor: vendor ?? null,
        price,
        currency,
        pack_size: null,
        url: url ?? null,
        retrieved_at: new Date().toISOString(),
        confidence: /price|usd|eur|gbp|\$|€|£/i.test(t) ? 0.55 : 0.35,
        evidence: t.slice(0, 280)
      });
    }
  }
  return out;
}

function buildPriceQuery(m: RequiredMaterial): string {
  const base = (m.search_query || m.item_name).trim();
  const hint = (m.preferred_supplier_hint ?? "").trim();
  // Encourage vendor pages that actually show price/pack size.
  return `${base} ${hint ? hint + " " : ""}price pack size catalog number`;
}

export async function groundMaterials(required: RequiredMaterial[], opts?: { maxResultsPerMaterial?: number }) {
  const maxResultsPerMaterial = opts?.maxResultsPerMaterial ?? 3;
  const pricing_context: PricingContext = {};

  for (const m of required) {
    const q = buildPriceQuery(m);
    if (!q) continue;
    const results = await tavilySearch(q, { maxResults: maxResultsPerMaterial });
    const quotes: PriceQuote[] = [];
    for (const r of results) {
      const text = (r.content ?? r.snippet ?? "").trim();
      quotes.push(...extractQuotesFromText(text, r.url, r.title));
    }
    pricing_context[m.item_name] = { query: q, results, quotes: quotes.slice(0, 5) };
  }

  return pricing_context;
}

