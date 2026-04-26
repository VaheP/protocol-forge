"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState, type ReactNode } from "react";

export type SectionComment = {
  id: string;
  section: string | null;
  selected_text: string | null;
  comment_text: string | null;
  severity: string | null;
  feedback_type: string | null;
  is_global: boolean;
  char_start: number | null;
  char_end: number | null;
  created_at: string;
};

type HighlightRect = { top: number; left: number; width: number; height: number };

type Props = {
  planId: string;
  sectionKey: string;
  title: string;
  children: ReactNode;
  comments: SectionComment[];
  onCommentAdded: (comment: SectionComment) => void;
  onCommentDeleted: (id: string) => void;
};

const SEVERITY_BG: Record<string, string> = {
  Low: "rgba(253,224,71,0.4)",
  Medium: "rgba(251,146,60,0.4)",
  High: "rgba(248,113,113,0.4)",
};
const SEVERITY_BORDER: Record<string, string> = {
  Low: "#ca8a04",
  Medium: "#ea580c",
  High: "#dc2626",
};
const SEVERITY_PILL: Record<string, string> = {
  Low: "bg-yellow-100 text-yellow-800 border-yellow-300",
  Medium: "bg-orange-100 text-orange-800 border-orange-300",
  High: "bg-red-100 text-red-800 border-red-300",
};

// Convert a (container, offset) selection point to a character offset within root.
// Handles BOTH text nodes and element nodes (which the browser uses on triple-click, etc.).
function toCharOffset(root: HTMLElement, container: Node, offset: number): number {
  try {
    const r = document.createRange();
    r.setStart(root, 0);
    r.setEnd(container, offset);
    return r.toString().length;
  } catch {
    return 0;
  }
}

// Restore a Range from character offsets within root.
function rangeFromOffsets(root: HTMLElement, start: number, end: number): Range | null {
  if (start == null || end == null || start >= end) return null;

  function findPos(target: number): { node: Text; offset: number } | null {
    let count = 0;
    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    while (walker.nextNode()) {
      const node = walker.currentNode as Text;
      const len = node.textContent?.length ?? 0;
      if (count + len >= target) return { node, offset: target - count };
      count += len;
    }
    return null;
  }

  const s = findPos(start);
  const e = findPos(end);
  if (!s || !e) return null;

  try {
    const range = document.createRange();
    range.setStart(s.node, s.offset);
    range.setEnd(e.node, e.offset);
    return range;
  } catch {
    return null;
  }
}

// Compute highlight rects relative to a positioned container element.
function rectsForRange(range: Range, container: HTMLElement): HighlightRect[] {
  const base = container.getBoundingClientRect();
  // Subtract border to align with the padding-box origin used by position:absolute
  const borderLeft = parseFloat(getComputedStyle(container).borderLeftWidth) || 0;
  const borderTop = parseFloat(getComputedStyle(container).borderTopWidth) || 0;
  return Array.from(range.getClientRects())
    .filter((r) => r.width > 0 && r.height > 0)
    .map((r) => ({
      top: r.top - base.top - borderTop,
      left: r.left - base.left - borderLeft,
      width: r.width,
      height: r.height,
    }));
}

type PopupState =
  | { kind: "none" }
  | { kind: "new"; top: number; left: number; charStart: number; charEnd: number; selectedText: string }
  | { kind: "view"; comment: SectionComment; top: number; left: number };

export function CommentableSection({
  planId, sectionKey, title, children, comments, onCommentAdded, onCommentDeleted,
}: Props) {
  // outerRef: the positioned container (position:relative) — highlights anchor here
  const outerRef = useRef<HTMLDivElement | null>(null);
  // contentRef: wraps ONLY {children}, used for char-offset traversal (no chrome text)
  const contentRef = useRef<HTMLDivElement | null>(null);

  const [highlights, setHighlights] = useState<Map<string, HighlightRect[]>>(new Map());
  const [popup, setPopup] = useState<PopupState>({ kind: "none" });
  const [addBtnPos, setAddBtnPos] = useState<{ top: number; left: number } | null>(null);
  const [pendingSel, setPendingSel] = useState<{ charStart: number; charEnd: number; text: string } | null>(null);

  // Form fields
  const [commentText, setCommentText] = useState("");
  const [severity, setSeverity] = useState("Medium");
  const [feedbackType, setFeedbackType] = useState("Other");
  const [isGlobal, setIsGlobal] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Edit/delete state
  const [editing, setEditing] = useState(false);
  const [editText, setEditText] = useState("");
  const [deleting, setDeleting] = useState(false);

  const recompute = useCallback(() => {
    const outer = outerRef.current;
    const content = contentRef.current;
    if (!outer || !content) return;
    const next = new Map<string, HighlightRect[]>();
    for (const c of comments) {
      if (c.char_start == null || c.char_end == null) continue;
      const range = rangeFromOffsets(content, c.char_start, c.char_end);
      if (range) next.set(c.id, rectsForRange(range, outer));
    }
    setHighlights(next);
  }, [comments]);

  useLayoutEffect(() => { recompute(); }, [recompute]);

  useEffect(() => {
    window.addEventListener("resize", recompute);
    return () => window.removeEventListener("resize", recompute);
  }, [recompute]);

  // Detect text selection inside contentRef
  useEffect(() => {
    function onMouseUp() {
      const content = contentRef.current;
      const outer = outerRef.current;
      if (!content || !outer) return;

      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0 || sel.isCollapsed) {
        setAddBtnPos(null);
        setPendingSel(null);
        return;
      }
      const range = sel.getRangeAt(0);
      if (!content.contains(range.commonAncestorContainer)) {
        setAddBtnPos(null);
        setPendingSel(null);
        return;
      }
      const text = sel.toString().trim();
      if (!text) {
        setAddBtnPos(null);
        setPendingSel(null);
        return;
      }

      // Use range.toString()-based offset — works for both text nodes and element nodes
      const charStart = toCharOffset(content, range.startContainer, range.startOffset);
      const charEnd = toCharOffset(content, range.endContainer, range.endOffset);
      if (charEnd <= charStart) return;

      setPendingSel({ charStart, charEnd, text });

      // Position the "+ Comment" button just below and after the selection end
      const rects = range.getClientRects();
      const last = rects[rects.length - 1];
      const outerRect = outer.getBoundingClientRect();
      const borderLeft = parseFloat(getComputedStyle(outer).borderLeftWidth) || 0;
      const borderTop = parseFloat(getComputedStyle(outer).borderTopWidth) || 0;
      setAddBtnPos({
        top: last.bottom - outerRect.top - borderTop + 4,
        left: Math.min(last.right - outerRect.left - borderLeft, outer.offsetWidth - 120),
      });
    }
    document.addEventListener("mouseup", onMouseUp);
    return () => document.removeEventListener("mouseup", onMouseUp);
  }, []);

  function openNewPopup() {
    if (!pendingSel || !outerRef.current) return;
    const w = outerRef.current.offsetWidth;
    setPopup({
      kind: "new",
      top: addBtnPos!.top + 24,
      left: Math.max(0, Math.min(addBtnPos!.left, w - 308)),
      charStart: pendingSel.charStart,
      charEnd: pendingSel.charEnd,
      selectedText: pendingSel.text,
    });
    setCommentText(""); setSeverity("Medium"); setFeedbackType("Other");
    setIsGlobal(false); setSaveError(null);
    setAddBtnPos(null);
    window.getSelection()?.removeAllRanges();
  }

  function openViewPopup(comment: SectionComment, e: React.MouseEvent) {
    e.stopPropagation();
    const outer = outerRef.current;
    if (!outer) return;
    const outerRect = outer.getBoundingClientRect();
    const borderLeft = parseFloat(getComputedStyle(outer).borderLeftWidth) || 0;
    const borderTop = parseFloat(getComputedStyle(outer).borderTopWidth) || 0;
    const top = e.clientY - outerRect.top - borderTop + 8;
    const left = Math.max(0, Math.min(e.clientX - outerRect.left - borderLeft, outer.offsetWidth - 308));
    setPopup({ kind: "view", comment, top, left });
    setEditing(false);
    setEditText(comment.comment_text ?? "");
    setDeleting(false);
    setSaveError(null);
  }

  function closePopup() {
    setPopup({ kind: "none" });
    setEditing(false);
    setDeleting(false);
    setSaveError(null);
  }

  async function saveComment() {
    if (popup.kind !== "new") return;
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch("/api/save-comment", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          plan_id: planId,
          section: sectionKey,
          selected_text: popup.selectedText,
          comment_text: commentText,
          feedback_type: feedbackType,
          severity,
          reusable: isGlobal,
          is_global: isGlobal,
          char_start: popup.charStart,
          char_end: popup.charEnd,
        }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Save failed");
      onCommentAdded(json.comment as SectionComment);

      // If this comment created a global skill rule, nudge the sidebar to refresh.
      if (json?.skill_rule?.id) {
        try {
          window.dispatchEvent(new CustomEvent("pf:memory-updated", { detail: { skill_rule_id: json.skill_rule.id } }));
        } catch {
          // ignore
        }
      }

      closePopup();
    } catch (err: any) {
      setSaveError(err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  async function saveEdit() {
    if (popup.kind !== "view") return;
    setSaving(true); setSaveError(null);
    try {
      const res = await fetch(`/api/comments/${popup.comment.id}`, {
        method: "PATCH",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ comment_text: editText }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json?.message ?? "Update failed");
      onCommentAdded({ ...popup.comment, comment_text: editText });
      closePopup();
    } catch (err: any) {
      setSaveError(err?.message ?? String(err));
    } finally {
      setSaving(false);
    }
  }

  async function deleteComment() {
    if (popup.kind !== "view") return;
    setDeleting(true);
    try {
      const res = await fetch(`/api/comments/${popup.comment.id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Delete failed");
      onCommentDeleted(popup.comment.id);
      closePopup();
    } catch (err: any) {
      setSaveError(err?.message ?? String(err));
    } finally {
      setDeleting(false);
    }
  }

  return (
    <div className="space-y-2">
      <div className="text-sm font-semibold text-slate-800">{title}</div>

      {/* Outer container: position:relative so absolute children anchor here */}
      <div
        ref={outerRef}
        className="relative rounded-xl border border-slate-200 bg-white p-4 text-sm leading-relaxed text-slate-700"
      >
        {/* Highlight overlays — absolutely positioned, pointer-events via z-index */}
        {comments.map((c) => {
          const rects = highlights.get(c.id) ?? [];
          const bg = SEVERITY_BG[c.severity ?? ""] ?? SEVERITY_BG.Medium;
          const border = SEVERITY_BORDER[c.severity ?? ""] ?? SEVERITY_BORDER.Medium;
          return rects.map((r, i) => (
            <div
              key={`${c.id}-${i}`}
              onClick={(e) => openViewPopup(c, e)}
              style={{
                position: "absolute",
                top: r.top,
                left: r.left,
                width: r.width,
                height: r.height,
                background: bg,
                borderBottom: `2px solid ${border}`,
                mixBlendMode: "multiply",
                cursor: "pointer",
                zIndex: 2,
                borderRadius: 2,
                pointerEvents: "all",
              }}
            />
          ));
        })}

        {/* + Comment button — floats just after selection end */}
        {addBtnPos && (
          <button
            onMouseDown={(e) => e.preventDefault()}
            onClick={openNewPopup}
            style={{ position: "absolute", top: addBtnPos.top, left: addBtnPos.left, zIndex: 20 }}
            className="inline-flex items-center gap-1 rounded-full bg-[#0b1220] text-white text-[11px] font-medium px-2.5 py-1 shadow-lg hover:bg-[#1a2540] transition-colors select-none"
          >
            + Comment
          </button>
        )}

        {/* New comment popup */}
        {popup.kind === "new" && (
          <div
            style={{ position: "absolute", top: popup.top, left: popup.left, zIndex: 30, width: 308 }}
            className="rounded-xl border border-slate-200 bg-white shadow-xl p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="text-[11px] font-medium text-slate-500 uppercase tracking-wider">Add comment</div>
            <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-600 italic line-clamp-2">
              "{popup.selectedText}"
            </div>
            <textarea
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="What's wrong or needs improvement?"
              className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] outline-none resize-none focus:ring-2 focus:ring-[#2240b3]/20 focus:border-[#2240b3]"
              rows={3}
              autoFocus
            />
            <div className="flex gap-2">
              <select value={severity} onChange={(e) => setSeverity(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] outline-none bg-white">
                {["Low", "Medium", "High"].map((s) => <option key={s}>{s}</option>)}
              </select>
              <select value={feedbackType} onChange={(e) => setFeedbackType(e.target.value)}
                className="flex-1 rounded-lg border border-slate-200 px-2 py-1.5 text-[12px] outline-none bg-white">
                {["Other", "Incorrect method", "Missing control", "Wrong reagent", "Missing validation", "Timeline", "Budget", "Safety"].map((s) => <option key={s}>{s}</option>)}
              </select>
            </div>
            <label className="flex items-center gap-2 text-[11px] text-slate-600 cursor-pointer select-none">
              <input type="checkbox" checked={isGlobal} onChange={(e) => setIsGlobal(e.target.checked)} className="rounded" />
              Save as a global rule (use this in future plans)
            </label>
            {saveError && <div className="text-[11px] text-red-600">{saveError}</div>}
            <div className="flex justify-end gap-2 pt-1">
              <button onClick={closePopup} className="text-[12px] text-slate-500 hover:text-slate-800 px-2 py-1">Cancel</button>
              <button
                onClick={saveComment}
                disabled={!commentText.trim() || saving}
                className="rounded-lg bg-[#0b1220] text-white text-[12px] font-medium px-3 py-1.5 hover:bg-[#1a2540] disabled:opacity-40 transition-colors"
              >
                {saving ? "Saving…" : "Save"}
              </button>
            </div>
          </div>
        )}

        {/* View / edit popup */}
        {popup.kind === "view" && (
          <div
            style={{ position: "absolute", top: popup.top, left: popup.left, zIndex: 30, width: 308 }}
            className="rounded-xl border border-slate-200 bg-white shadow-xl p-3 space-y-2"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-2">
              <span className={`inline-flex items-center rounded-full border px-2 py-0.5 text-[10px] font-medium ${SEVERITY_PILL[popup.comment.severity ?? ""] ?? SEVERITY_PILL.Medium}`}>
                {popup.comment.severity ?? "Medium"}
              </span>
              {popup.comment.is_global && (
                <span className="text-[10px] text-violet-700 font-medium">Global rule</span>
              )}
              <button onClick={closePopup} className="ml-auto text-slate-400 hover:text-slate-700 text-[16px] leading-none">×</button>
            </div>
            {popup.comment.selected_text && (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-2.5 py-1.5 text-[11px] text-slate-500 italic line-clamp-2">
                "{popup.comment.selected_text}"
              </div>
            )}
            {editing ? (
              <textarea
                value={editText}
                onChange={(e) => setEditText(e.target.value)}
                className="w-full rounded-lg border border-slate-200 px-2.5 py-2 text-[12px] outline-none resize-none focus:ring-2 focus:ring-[#2240b3]/20 focus:border-[#2240b3]"
                rows={3}
                autoFocus
              />
            ) : (
              <div className="text-[12px] text-slate-700 leading-relaxed">{popup.comment.comment_text}</div>
            )}
            {saveError && <div className="text-[11px] text-red-600">{saveError}</div>}
            <div className="flex justify-between gap-2 pt-1">
              <button onClick={deleteComment} disabled={deleting}
                className="text-[12px] text-red-500 hover:text-red-700 disabled:opacity-40">
                {deleting ? "Deleting…" : "Delete"}
              </button>
              <div className="flex gap-2">
                {editing ? (
                  <>
                    <button onClick={() => setEditing(false)} className="text-[12px] text-slate-500 hover:text-slate-800 px-2 py-1">Cancel</button>
                    <button onClick={saveEdit} disabled={!editText.trim() || saving}
                      className="rounded-lg bg-[#0b1220] text-white text-[12px] font-medium px-3 py-1.5 hover:bg-[#1a2540] disabled:opacity-40 transition-colors">
                      {saving ? "Saving…" : "Save"}
                    </button>
                  </>
                ) : (
                  <button onClick={() => { setEditing(true); setEditText(popup.comment.comment_text ?? ""); }}
                    className="rounded-lg border border-slate-200 text-[12px] text-slate-700 px-3 py-1.5 hover:bg-slate-50 transition-colors">
                    Edit
                  </button>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Dismiss backdrop */}
        {popup.kind !== "none" && (
          <div style={{ position: "fixed", inset: 0, zIndex: 25 }} onClick={closePopup} />
        )}

        {/* Content — separate ref, no chrome text polluting char offsets */}
        <div ref={contentRef} className="select-text">
          {children}
        </div>
      </div>
    </div>
  );
}
