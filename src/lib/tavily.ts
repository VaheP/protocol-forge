import { env } from "@/lib/env";

export type TavilyResult = {
  title: string;
  url: string;
  content?: string;
  snippet?: string;
  score?: number;
  source?: string;
};

type TavilySearchResponse = {
  results?: Array<{
    title?: string;
    url?: string;
    content?: string;
    score?: number;
    raw_content?: string;
  }>;
};

function mockSearch(query: string): TavilyResult[] {
  const q = query.toLowerCase();

  if (q.includes("fitc-dextran") || q.includes("gut barrier") || q.includes("lactobacillus")) {
    return [
      {
        title: "FITC-dextran intestinal permeability assay in mice (protocol overview)",
        url: "https://example.org/fitc-dextran-mouse-protocol",
        snippet: "Common protocol for measuring intestinal permeability via oral gavage and serum fluorescence.",
        score: 0.86,
        source: "mock"
      },
      {
        title: "Probiotics and tight junction proteins in murine models",
        url: "https://example.org/probiotics-tight-junction-mice",
        snippet: "LGG and other probiotics modulate occludin/claudin expression and barrier function.",
        score: 0.74,
        source: "mock"
      }
    ];
  }

  if (q.includes("crp") && (q.includes("electrochemical") || q.includes("biosensor"))) {
    return [
      {
        title: "Paper-based electrochemical immunosensors for CRP detection",
        url: "https://example.org/crp-paper-electrochemical",
        snippet: "Review of paper-based electrochemical platforms and validation considerations.",
        score: 0.82,
        source: "mock"
      }
    ];
  }

  if (q.includes("trehalose") || q.includes("hela") || q.includes("cryopreservation")) {
    return [
      {
        title: "Trehalose-assisted cryopreservation for mammalian cells",
        url: "https://example.org/trehalose-cryopreservation-cells",
        snippet: "Trehalose can improve post-thaw viability under certain protocols; includes viability timepoints.",
        score: 0.79,
        source: "mock"
      }
    ];
  }

  // price grounding mocks
  if (q.includes("catalog") || q.includes("price")) {
    return [
      {
        title: "Supplier listing (mock)",
        url: "https://example.org/supplier-mock",
        snippet: "Catalog: supplier lookup required. Price not found in supplied context.",
        score: 0.5,
        source: "mock"
      }
    ];
  }

  return [
    {
      title: "General scientific reference (mock)",
      url: "https://example.org/general-mock",
      snippet: "Mock result used when TAVILY_API_KEY is not configured.",
      score: 0.4,
      source: "mock"
    }
  ];
}

export async function tavilySearch(query: string, opts?: { maxResults?: number }): Promise<TavilyResult[]> {
  const apiKey = env("TAVILY_API_KEY");
  const maxResults = opts?.maxResults ?? 5;

  if (!apiKey) return mockSearch(query).slice(0, maxResults);
  const bearer = apiKey.startsWith("tvly-") ? apiKey : `tvly-${apiKey}`;

  const res = await fetch("https://api.tavily.com/search", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${bearer}`
    },
    body: JSON.stringify({
      query,
      max_results: maxResults,
      include_raw_content: false
    })
  });

  if (!res.ok) {
    // If Tavily key exists but call fails, return clearly-marked placeholder results
    const text = await res.text().catch(() => "");
    return [
      {
        title: "Tavily error (check TAVILY_API_KEY)",
        url: "",
        snippet: `HTTP ${res.status} from Tavily. ${text.slice(0, 200)}`.trim(),
        score: 0,
        source: "tavily_error"
      }
    ];
  }

  const json = (await res.json()) as TavilySearchResponse;
  const results = (json.results ?? []).map((r) => ({
    title: r.title ?? "",
    url: r.url ?? "",
    content: r.content,
    snippet: r.content,
    score: r.score,
    source: "tavily"
  }));
  return results.slice(0, maxResults);
}

