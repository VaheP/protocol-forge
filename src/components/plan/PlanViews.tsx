import React from "react";

function EmptyState({ title }: { title: string }) {
  return <div className="text-sm text-muted-foreground">{title}</div>;
}

export function ProtocolView({ steps }: { steps: any[] }) {
  if (!Array.isArray(steps) || steps.length === 0) return <EmptyState title="No protocol steps yet." />;
  return (
    <div className="space-y-4">
      {steps.map((s) => (
        <div key={String(s.step)} className="rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm font-semibold">
              Step {s.step}: {s.title}
            </div>
            {s.duration ? <div className="text-xs text-muted-foreground">{s.duration}</div> : null}
          </div>
          {s.description ? <div className="mt-2 text-sm leading-relaxed">{s.description}</div> : null}
          {Array.isArray(s.critical_notes) && s.critical_notes.length ? (
            <div className="mt-3 rounded-md border bg-muted/30 p-3">
              <div className="text-xs font-medium text-muted-foreground">Critical notes</div>
              <ul className="mt-2 list-disc space-y-1 pl-5 text-sm">
                {s.critical_notes.map((n: string, idx: number) => (
                  <li key={idx}>{n}</li>
                ))}
              </ul>
            </div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function MaterialsView({ materials }: { materials: any[] }) {
  if (!Array.isArray(materials) || materials.length === 0) return <EmptyState title="No materials listed yet." />;
  return (
    <div className="overflow-x-auto rounded-lg border">
      <table className="w-full text-sm">
        <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
          <tr>
            <th className="px-3 py-2">Item</th>
            <th className="px-3 py-2">Use</th>
            <th className="px-3 py-2">Supplier</th>
            <th className="px-3 py-2">Catalog</th>
            <th className="px-3 py-2">Price</th>
            <th className="px-3 py-2">Source</th>
          </tr>
        </thead>
        <tbody>
          {materials.map((m, idx) => (
            <tr key={idx} className="border-t">
              <td className="px-3 py-3 align-top font-medium">{m.item_name}</td>
              <td className="px-3 py-3 align-top text-muted-foreground">{m.intended_use}</td>
              <td className="px-3 py-3 align-top">{m.supplier || "—"}</td>
              <td className="px-3 py-3 align-top">{m.catalog_number || "supplier lookup required"}</td>
              <td className="px-3 py-3 align-top">
                {m.price == null ? (
                  <span className="text-muted-foreground">{m.price_note || "—"}</span>
                ) : (
                  <span>
                    {String(m.price)} {m.price_currency ? String(m.price_currency) : ""}
                  </span>
                )}
              </td>
              <td className="px-3 py-3 align-top">
                {m.source_url ? (
                  <a className="underline" href={m.source_url} target="_blank" rel="noreferrer">
                    Link
                  </a>
                ) : (
                  "—"
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function BudgetView({ budget }: { budget: any }) {
  if (!budget) return <EmptyState title="No budget section yet." />;
  const items = Array.isArray(budget.line_items) ? budget.line_items : [];
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <div className="text-xs text-muted-foreground">Estimated total</div>
          <div className="text-lg font-semibold">
            {budget.total_estimated_cost == null ? "Not grounded" : String(budget.total_estimated_cost)}{" "}
            {budget.currency ? <span className="text-sm font-normal text-muted-foreground">{budget.currency}</span> : null}
          </div>
        </div>
        {budget.limitations ? <div className="max-w-xl text-xs text-muted-foreground">{budget.limitations}</div> : null}
      </div>

      {items.length === 0 ? (
        <EmptyState title="No budget line items yet." />
      ) : (
        <div className="overflow-x-auto rounded-lg border">
          <table className="w-full text-sm">
            <thead className="bg-muted/40 text-left text-xs text-muted-foreground">
              <tr>
                <th className="px-3 py-2">Category</th>
                <th className="px-3 py-2">Item</th>
                <th className="px-3 py-2">Cost</th>
                <th className="px-3 py-2">Notes</th>
              </tr>
            </thead>
            <tbody>
              {items.map((li: any, idx: number) => (
                <tr key={idx} className="border-t">
                  <td className="px-3 py-3 align-top">{li.category}</td>
                  <td className="px-3 py-3 align-top font-medium">{li.item_name}</td>
                  <td className="px-3 py-3 align-top">{li.cost == null ? <span className="text-muted-foreground">—</span> : String(li.cost)}</td>
                  <td className="px-3 py-3 align-top text-muted-foreground">{li.note}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function TimelineView({ timeline }: { timeline: any[] }) {
  if (!Array.isArray(timeline) || timeline.length === 0) return <EmptyState title="No timeline yet." />;
  return (
    <div className="space-y-3">
      {timeline.map((t, idx) => (
        <div key={idx} className="rounded-lg border bg-background p-4">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div className="text-sm font-semibold">{t.phase}</div>
            <div className="text-xs text-muted-foreground">{t.duration}</div>
          </div>
          {t.deliverable ? <div className="mt-2 text-sm text-muted-foreground">Deliverable: {t.deliverable}</div> : null}
          {Array.isArray(t.dependencies) && t.dependencies.length ? (
            <div className="mt-2 text-xs text-muted-foreground">Dependencies: {t.dependencies.join(", ")}</div>
          ) : null}
        </div>
      ))}
    </div>
  );
}

export function ValidationView({ items }: { items: any[] }) {
  if (!Array.isArray(items) || items.length === 0) return <EmptyState title="No validation plan yet." />;
  return (
    <div className="space-y-3">
      {items.map((v, idx) => (
        <div key={idx} className="rounded-lg border bg-background p-4">
          <div className="text-sm font-semibold">{v.test}</div>
          <div className="mt-2 text-sm text-muted-foreground">{v.purpose}</div>
          <div className="mt-2 rounded-md border bg-muted/30 p-3 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Success criterion: </span>
            {v.success_criterion}
          </div>
        </div>
      ))}
    </div>
  );
}

export function ControlsView({ controls }: { controls: any[] }) {
  if (!Array.isArray(controls) || controls.length === 0) return <EmptyState title="No controls listed yet." />;
  return (
    <div className="space-y-3">
      {controls.map((c, idx) => (
        <div key={idx} className="rounded-lg border bg-background p-4">
          <div className="text-sm font-semibold">{c.control}</div>
          <div className="mt-2 text-sm text-muted-foreground">{c.rationale}</div>
        </div>
      ))}
    </div>
  );
}

export function RisksView({ risks }: { risks: any[] }) {
  if (!Array.isArray(risks) || risks.length === 0) return <EmptyState title="No risks listed yet." />;
  return (
    <div className="space-y-3">
      {risks.map((r, idx) => (
        <div key={idx} className="rounded-lg border bg-background p-4">
          <div className="text-sm font-semibold">{r.risk}</div>
          <div className="mt-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Impact: </span>
            {r.impact}
          </div>
          <div className="mt-2 text-sm">
            <span className="text-xs font-medium text-muted-foreground">Mitigation: </span>
            {r.mitigation}
          </div>
        </div>
      ))}
    </div>
  );
}

export function PiReviewView({ text }: { text: string }) {
  if (!text) return <EmptyState title="No PI review warning provided." />;
  return <div className="rounded-lg border bg-amber-50/40 p-4 text-sm leading-relaxed">{text}</div>;
}
