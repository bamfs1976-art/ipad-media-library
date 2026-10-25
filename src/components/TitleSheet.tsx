"use client";

import { useEffect, useState } from "react";
import type { Collection, Episode, Source, Title, TitleMeta } from "@/lib/types.ts";

interface Props {
  title: Title;
  meta: TitleMeta;
  allTags: string[];
  collections: Collection[];
  sources: Source[];
  onMeta: (meta: TitleMeta) => void;
  onCollections: (next: Collection[]) => void;
  onClose: () => void;
}

function bySeason(files: Episode[]): [string, Episode[]][] {
  const groups = new Map<string, Episode[]>();
  for (const f of files) {
    const label = f.season === undefined ? "Episodes" : f.season === 0 ? "Specials" : `Season ${f.season}`;
    groups.set(label, [...(groups.get(label) ?? []), f]);
  }
  return [...groups.entries()];
}

export default function TitleSheet({ title, meta, allTags, collections, sources, onMeta, onCollections, onClose }: Props) {
  const [tagInput, setTagInput] = useState("");
  const [copied, setCopied] = useState<string | null>(null);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  const addTag = (raw: string) => {
    const tag = raw.trim();
    if (!tag || meta.tags.includes(tag)) return;
    onMeta({ ...meta, tags: [...meta.tags, tag].sort((a, b) => a.localeCompare(b)) });
    setTagInput("");
  };

  const removeTag = (tag: string) => onMeta({ ...meta, tags: meta.tags.filter((t) => t !== tag) });

  const toggleCollection = (id: string) =>
    onCollections(
      collections.map((c) =>
        c.id !== id
          ? c
          : {
              ...c,
              titleKeys: c.titleKeys.includes(title.key)
                ? c.titleKeys.filter((k) => k !== title.key)
                : [...c.titleKeys, title.key],
            },
      ),
    );

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(url);
      setTimeout(() => setCopied(null), 1500);
    } catch {
      prompt("Copy this link", url);
    }
  };

  const suggestions = allTags.filter((t) => !meta.tags.includes(t));
  const sourceNames = sources.filter((s) => title.sourceIds.includes(s.id)).map((s) => s.name);

  return (
    <div className="fixed inset-0 z-30 flex items-end justify-center bg-black/40 sm:items-center" onClick={onClose}>
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="sheet-title"
        onClick={(e) => e.stopPropagation()}
        className="flex max-h-[90vh] w-full max-w-2xl flex-col rounded-t-3xl bg-surface shadow-xl sm:rounded-3xl"
      >
        <div className="flex items-start justify-between gap-3 border-b border-border p-5">
          <div>
            <h2 id="sheet-title" className="text-xl font-semibold">
              {title.name}
            </h2>
            <p className="text-sm text-muted">
              {title.kind === "film" ? "Film" : "TV show"}
              {title.year ? ` · ${title.year}` : ""}
              {sourceNames.length > 0 && ` · ${sourceNames.join(", ")}`}
            </p>
          </div>
          <button onClick={onClose} className="min-h-11 min-w-11 rounded-full bg-surface-2 text-lg" aria-label="Close">
            ✕
          </button>
        </div>

        <div className="space-y-6 overflow-y-auto p-5">
          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Tags</h3>
            <div className="mb-2 flex flex-wrap gap-2">
              {meta.tags.length === 0 && <span className="text-sm text-muted">No tags yet.</span>}
              {meta.tags.map((t) => (
                <button
                  key={t}
                  onClick={() => removeTag(t)}
                  className="min-h-9 rounded-full bg-accent-soft px-3 text-sm"
                  aria-label={`Remove tag ${t}`}
                >
                  {t} ✕
                </button>
              ))}
            </div>
            <form
              onSubmit={(e) => {
                e.preventDefault();
                addTag(tagInput);
              }}
              className="flex gap-2"
            >
              <input
                value={tagInput}
                onChange={(e) => setTagInput(e.target.value)}
                placeholder="New tag"
                className="min-h-11 flex-1 rounded-xl border border-border bg-bg px-3 text-base outline-none focus:border-accent"
                aria-label="New tag"
              />
              <button type="submit" className="min-h-11 rounded-xl border border-border px-4 text-sm">
                Add
              </button>
            </form>
            {suggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-2">
                {suggestions.map((t) => (
                  <button key={t} onClick={() => addTag(t)} className="min-h-9 rounded-full border border-border px-3 text-sm text-muted">
                    + {t}
                  </button>
                ))}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">Collections</h3>
            {collections.length === 0 ? (
              <p className="text-sm text-muted">Create a collection in the Collections tab first.</p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {collections.map((c) => {
                  const on = c.titleKeys.includes(title.key);
                  return (
                    <button
                      key={c.id}
                      onClick={() => toggleCollection(c.id)}
                      aria-pressed={on}
                      className={`min-h-9 rounded-full border px-3 text-sm ${
                        on ? "border-accent bg-accent-soft" : "border-border text-muted"
                      }`}
                    >
                      {on ? "✓ " : ""}
                      {c.name}
                    </button>
                  );
                })}
              </div>
            )}
          </section>

          <section>
            <h3 className="mb-2 text-sm font-semibold uppercase tracking-wide text-muted">
              Files ({title.files.length})
            </h3>
            {bySeason(title.files).map(([label, eps]) => (
              <div key={label} className="mb-4">
                {title.kind === "show" && <p className="mb-1 font-medium">{label}</p>}
                <ul className="divide-y divide-border rounded-xl border border-border">
                  {eps.map((f) => (
                    <li key={f.url} className="flex items-center gap-3 p-3">
                      <span className="min-w-0 flex-1">
                        {f.episode !== undefined && <span className="mr-2 text-sm text-muted">E{f.episode}</span>}
                        <span className="break-all text-sm">{f.rawName}</span>
                      </span>
                      <button onClick={() => copy(f.url)} className="min-h-9 shrink-0 rounded-lg border border-border px-3 text-xs">
                        {copied === f.url ? "Copied" : "Copy link"}
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </section>
        </div>
      </div>
    </div>
  );
}
