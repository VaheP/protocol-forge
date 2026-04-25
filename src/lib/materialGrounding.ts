import { tavilySearch, type TavilyResult } from "@/lib/tavily";

export type RequiredMaterial = {
  item_name: string;
  intended_use: string;
  preferred_supplier_hint: string;
  search_query: string;
};

export type PricingContext = Record<
  string,
  {
    query: string;
    results: TavilyResult[];
  }
>;

export async function groundMaterials(required: RequiredMaterial[], opts?: { maxResultsPerMaterial?: number }) {
  const maxResultsPerMaterial = opts?.maxResultsPerMaterial ?? 3;
  const pricing_context: PricingContext = {};

  for (const m of required) {
    const q = (m.search_query ?? "").trim();
    if (!q) continue;
    const results = await tavilySearch(q, { maxResults: maxResultsPerMaterial });
    pricing_context[m.item_name] = { query: q, results };
  }

  return pricing_context;
}

