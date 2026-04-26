"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type Q = { id: string; question_text: string; options: string[] };

export default function ClarifyPage({ params }: { params: { id: string } }) {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [project, setProject] = useState<any>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [needsClarification, setNeedsClarification] = useState<boolean>(true);
  const [clarifyRationale, setClarifyRationale] = useState<string>("");

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/projects/${params.id}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json?.error ?? "Not found");
        if (cancelled) return;
        setProject(json.project);

        const qRes = await fetch("/api/clarifying-questions", {
          method: "POST",
          headers: { "content-type": "application/json" },
          body: JSON.stringify({ project_id: params.id, parsed: json.project?.parsed_json })
        });
        const qJson = await qRes.json();
        if (!qRes.ok) throw new Error(qJson?.message ?? "Failed to load questions");
        if (cancelled) return;
        setNeedsClarification(Boolean(qJson.needs_clarification));
        setClarifyRationale(String(qJson.rationale ?? ""));
        setQuestions(qJson.questions ?? []);

        const defaults: Record<string, string> = {};
        for (const q of qJson.questions ?? []) defaults[q.id] = q.options?.[0] ?? "";
        setAnswers(defaults);
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

  const canSaveAnswers = useMemo(() => questions.length > 0 && !saving, [questions.length, saving]);
  const canSkip = useMemo(() => questions.length === 0 && !saving, [questions.length, saving]);

  async function goToLiterature() {
    router.push(`/projects/${params.id}/literature`);
  }

  async function onRunQC() {
    setSaving(true);
    setError(null);
    try {
      if (questions.length === 0) {
        await goToLiterature();
        return;
      }

      const payload = {
        project_id: params.id,
        answers: questions.map((q) => ({
          question_id: q.id,
          question_text: q.question_text,
          selected_answer: answers[q.id] ?? ""
        }))
      };
      const res = await fetch("/api/save-clarifications", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload)
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Failed to save");
      await goToLiterature();
    } catch (e: any) {
      setError(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-b from-background to-muted/30">
      <div className="mx-auto max-w-5xl px-6 py-12 space-y-6">
        <div className="flex items-center justify-between gap-3">
          <div>
            <div className="text-sm text-muted-foreground">ProtocolForge AI</div>
            <h1 className="text-2xl font-semibold tracking-tight">Clarify intent</h1>
            <div className="mt-1 text-sm text-muted-foreground">{project?.title ?? "Project"}</div>
          </div>
          <div className="flex gap-2">
            <Button variant="outline" asChild>
              <Link href="/new">New hypothesis</Link>
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
                <CardTitle className="text-base">Parsed hypothesis</CardTitle>
                <CardDescription>These fields guide the QC and planning pipeline.</CardDescription>
              </CardHeader>
              <CardContent className="grid gap-3 sm:grid-cols-2 text-sm">
                {[
                  ["Domain", project?.domain],
                  ["Experiment type", project?.experiment_type],
                  ["Target", project?.target],
                  ["Sample/model", project?.sample_type]
                ].map(([k, v]) => (
                  <div key={String(k)} className="rounded-md border bg-background p-3">
                    <div className="text-xs font-medium text-muted-foreground">{k}</div>
                    <div className="mt-1">{(v as any) ?? "Unknown"}</div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle className="text-base">Clarification questions</CardTitle>
                <CardDescription>
                  {needsClarification
                    ? "The model will only ask questions if they materially improve the plan."
                    : "No clarification needed — you can continue directly to literature QC."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {clarifyRationale ? (
                  <div className="rounded-md border bg-muted/30 p-3 text-xs text-muted-foreground whitespace-pre-wrap">{clarifyRationale}</div>
                ) : null}

                {questions.length === 0 ? (
                  <div className="text-sm text-muted-foreground">
                    No multiple-choice questions were generated for this hypothesis.
                  </div>
                ) : (
                  questions.map((q) => (
                    <div key={q.id} className="rounded-lg border bg-background p-4">
                      <div className="text-sm font-medium">{q.question_text}</div>
                      <div className="mt-3 grid gap-2 sm:grid-cols-2">
                        {q.options.map((opt) => (
                          <label key={opt} className="flex items-center gap-2 text-sm">
                            <input
                              type="radio"
                              name={q.id}
                              checked={(answers[q.id] ?? "") === opt}
                              onChange={() => setAnswers((a) => ({ ...a, [q.id]: opt }))}
                            />
                            {opt}
                          </label>
                        ))}
                      </div>
                    </div>
                  ))
                )}

                <div className="flex items-center justify-between gap-3">
                  <div className="text-xs text-muted-foreground">
                    Next step: run the research scan (uses Tavily when configured).
                  </div>
                  <Button onClick={onRunQC} disabled={!(canSaveAnswers || canSkip) || saving}>
                    {saving ? "Continuing…" : questions.length ? "Save answers & run literature QC" : "Continue to literature QC"}
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

