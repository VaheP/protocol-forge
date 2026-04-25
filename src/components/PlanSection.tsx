"use client";

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  planId: string;
  sectionKey: string;
  title: string;
  children: ReactNode;
  domain?: string | null;
  experimentType?: string | null;
};

export function PlanSection({ planId, sectionKey, title, children }: Props) {
  const rootRef = useRef<HTMLDivElement | null>(null);
  const [selectedText, setSelectedText] = useState("");
  const [open, setOpen] = useState(false);
  const [commentText, setCommentText] = useState("");
  const [feedbackType, setFeedbackType] = useState("Other");
  const [severity, setSeverity] = useState("Medium");
  const [reusable, setReusable] = useState(true);
  const [saving, setSaving] = useState(false);
  const [savedMsg, setSavedMsg] = useState<string | null>(null);

  const canSave = useMemo(() => selectedText.trim() && commentText.trim() && !saving, [selectedText, commentText, saving]);

  useEffect(() => {
    function selectionInsideRoot(sel: Selection | null) {
      if (!sel || sel.rangeCount === 0) return false;
      const node = sel.anchorNode;
      if (!node) return false;
      const el = node.nodeType === Node.ELEMENT_NODE ? (node as Element) : (node.parentElement as Element | null);
      if (!el) return false;
      return Boolean(rootRef.current && rootRef.current.contains(el));
    }

    function onSelectionChange() {
      const sel = window.getSelection();
      if (!selectionInsideRoot(sel)) return;
      const text = sel?.toString() ?? "";
      if (text.trim().length > 0) setSelectedText(text.trim().slice(0, 500));
    }

    document.addEventListener("selectionchange", onSelectionChange);
    return () => document.removeEventListener("selectionchange", onSelectionChange);
  }, []);

  async function save() {
    setSaving(true);
    setSavedMsg(null);
    try {
      const res = await fetch("/api/save-comment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          section: sectionKey,
          selected_text: selectedText,
          comment_text: commentText,
          feedback_type: feedbackType,
          severity,
          reusable
        })
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Save failed");
      setSavedMsg(reusable ? "Skill memory updated." : "Comment saved.");
      setCommentText("");
    } catch (e: any) {
      setSavedMsg(e?.message ?? String(e));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between gap-3">
        <div className="text-sm font-semibold">{title}</div>
        <Button variant="outline" size="sm" onClick={() => setOpen(true)} disabled={!selectedText.trim()}>
          Add expert comment
        </Button>
      </div>

      <div ref={rootRef} className="select-text rounded-lg border bg-background p-4 text-sm leading-relaxed">
        {children}
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Expert comment</DialogTitle>
            <DialogDescription>Select text in the plan, then save a correction as reusable skill memory (no live fine-tuning).</DialogDescription>
          </DialogHeader>

          <div className="space-y-3">
            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Selected text</div>
              <div className="max-h-28 overflow-auto rounded-md border bg-muted/30 p-3 text-xs whitespace-pre-wrap">{selectedText || "Select text in the plan first."}</div>
            </div>

            <div>
              <div className="mb-1 text-xs font-medium text-muted-foreground">Comment</div>
              <Textarea value={commentText} onChange={(e) => setCommentText(e.target.value)} className="min-h-[110px]" placeholder="e.g. Do not validate only in serum; include whole-blood matrix validation and anti-fouling controls." />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <label className="text-xs">
                <div className="mb-1 font-medium text-muted-foreground">Feedback type</div>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}>
                  {["Incorrect method", "Missing control", "Unrealistic timeline", "Wrong reagent", "Missing validation", "Budget issue", "Safety/ethics issue", "Other"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
              <label className="text-xs">
                <div className="mb-1 font-medium text-muted-foreground">Severity</div>
                <select className="h-10 w-full rounded-md border bg-background px-3 text-sm" value={severity} onChange={(e) => setSeverity(e.target.value)}>
                  {["Low", "Medium", "High"].map((x) => (
                    <option key={x} value={x}>
                      {x}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" checked={reusable} onChange={(e) => setReusable(e.target.checked)} />
              Save as reusable skill
            </label>
          </div>

          <DialogFooter>
            {savedMsg ? <div className="mr-auto text-xs text-muted-foreground">{savedMsg}</div> : null}
            <Button variant="outline" onClick={() => setOpen(false)}>
              Close
            </Button>
            <Button onClick={save} disabled={!canSave}>
              {saving ? "Saving…" : reusable ? "Save for future plans" : "Save comment"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

