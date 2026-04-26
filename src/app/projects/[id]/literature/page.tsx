"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { ChevronDown, ChevronUp } from "lucide-react";

function trafficVariant(signal: string) {
  if (signal === "not found") return "green";
  if (signal === "similar work exists") return "yellow";
  if (signal === "exact match found") return "red";
  return "default";
}

export default function LiteraturePage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [qc, setQc] = useState<any>(null);
  const [references, setReferences] = useState<any[]>([]);
  const [openRefs, setOpenRefs] = useState<Record<number, boolean>>({});

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Project not found");
        if (cancelled) return;
        setProject(json.project);
      } catch (e: any) {
        if (!cancelled) setError(e?.message ?? String(e));
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [params.id]);

  async function onRunQC() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/literature-qc", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: params.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "QC failed");
      setQc(json.literature_qc);
      setReferences(json.references ?? []);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  async function onGeneratePlan() {
    setRunning(true);
    setError(null);
    try {
      const res = await fetch("/api/generate-plan", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ project_id: params.id })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Plan generation failed");
      router.push(`/projects/${json.project.id}/plan?plan_id=${json.plan.id}`);
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setRunning(false);
    }
  }

  const canGenerate = useMemo(() => Boolean(qc) && !running, [qc, running]);

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">ProtocolForge AI</div>
            <h1 className="text-2xl font-semibold tracking-tight">Literature QC</h1>
            <div className="mt-1 text-sm text-muted-foreground">{project?.title ?? "Project"}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href={`/projects/${params.id}/clarify`}>Back</Link>
            </Button>
            <Button variant="outline" asChild>
              <Link href="/projects">Projects</Link>
            </Button>
          </div>
        </div>

        {loading ? (
          <div className="text-sm text-muted-foreground">Loading…</div>
        ) : error ? (
          <div className="rounded-md border border-destructive/40 bg-destructive/5 p-3 text-sm text-destructive">{error}</div>
        ) : (
          <>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Novelty check</CardTitle>
                <CardDescription>Traffic-light novelty signal based on search evidence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {qc ? (
                  <>
                    <div className="flex items-center gap-2">
                      <Badge variant={trafficVariant(qc.novelty_signal) as any}>{qc.novelty_signal}</Badge>
                      <div className="text-xs text-muted-foreground">Confidence: {qc.confidence ?? "—"}</div>
                    </div>
                    <div className="text-sm">{qc.summary}</div>

                    {references?.length ? (
                      <div className="space-y-2">
                        <div className="text-xs font-medium text-muted-foreground">References</div>
                        {references.slice(0, 3).map((r, idx) => (
                          <div key={idx} className="rounded-md border bg-background p-3 text-sm">
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 flex-1">
                                <div
                                  className={
                                    openRefs[idx]
                                      ? "font-medium leading-snug break-words whitespace-pre-wrap"
                                      : "font-medium leading-snug break-words [display:-webkit-box] [-webkit-line-clamp:2] [-webkit-box-orient:vertical] overflow-hidden"
                                  }
                                >
                                  {r.title}
                                </div>
                                <div className="mt-1 text-xs text-muted-foreground break-words">
                                  {r.relevance}
                                </div>
                              </div>
                              {r?.title && String(r.title).length > 140 ? (
                                <button
                                  type="button"
                                  className="shrink-0 rounded-md border bg-background px-2 py-1 text-muted-foreground hover:text-foreground"
                                  onClick={() => setOpenRefs((s) => ({ ...s, [idx]: !s[idx] }))}
                                  aria-label={openRefs[idx] ? "Collapse reference" : "Expand reference"}
                                >
                                  {openRefs[idx] ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                </button>
                              ) : null}
                            </div>
                            {r.url ? (
                              <a
                                className="mt-2 block max-w-full truncate text-xs underline underline-offset-2"
                                href={r.url}
                                target="_blank"
                                rel="noreferrer"
                                title={r.url}
                              >
                                {r.url}
                              </a>
                            ) : null}
                          </div>
                        ))}
                      </div>
                    ) : null}
                  </>
                ) : (
                  <div className="text-sm text-muted-foreground">Run QC to see novelty signal and references.</div>
                )}

                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Button onClick={onRunQC} disabled={running}>
                    {running ? "Running…" : "Run literature QC"}
                  </Button>
                  <Button onClick={onGeneratePlan} disabled={!canGenerate}>
                    Generate experiment plan
                  </Button>
                </div>
              </CardContent>
            </Card>
          </>
        )}
      </div>
    </main>
  );
}

