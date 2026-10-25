"use client";

import { useMemo, useState } from "react";
import type { Collection, MediaKind, Title, TitleMeta } from "@/lib/types.ts";

interface Props {
  titles: Title[];
  meta: Record<string, TitleMeta>;
  allTags: string[];
  collections: Collection[];
  collectionFilter: string | null;
  onCollectionFilter: (id: string | null) => void;
  onOpen: (key: string) => void;
  onAddSource: () => void;
}

type KindFilter = "all" | MediaKind;

const selectClass = "min-h-11 rounded-xl border border-border bg-surface px-3 text-sm";

function summary(t: Title): string {
  if (t.kind === "film") return t.files.length > 1 ? `${t.files.length} files` : "Film";
  const seasons = new Set(t.files.map((f) => f.season ?? 0)).size;
  return `${seasons} season${seasons === 1 ? "" : "s"} · ${t.files.length} episode${t.files.length === 1 ? "" : "s"}`;
}

export default function LibraryView({
  titles,
  meta,
  allTags,
  collections,
  collectionFilter,
  onCollectionFilter,
  onOpen,
  onAddSource,
}: Props) {
  const [query, setQuery] = useState("");
  const [kind, setKind] = useState<KindFilter>("all");
  const [tag, setTag] = useState("");
  const [year, setYear] = useState("");

  const years = useMemo(
    () => [...new Set(titles.map((t) => t.year).filter((y): y is number => !!y))].sort((a, b) => b - a),
    [titles],
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    const inCollection = collectionFilter
      ? new Set(collections.find((c) => c.id === collectionFilter)?.titleKeys ?? [])
      : null;
    return titles.filter((t) => {
      if (kind !== "all" && t.kind !== kind) return false;
      if (year && String(t.year) !== year) return false;
      if (tag && !(meta[t.key]?.tags ?? []).includes(tag)) return false;
      if (inCollection && !inCollection.has(t.key)) return false;
      if (q) {
        const haystack = [t.name, ...(meta[t.key]?.tags ?? []), ...t.files.map((f) => f.rawName)].join(" ").toLowerCase();
        if (!haystack.includes(q)) return false;
      }
      return true;
    });
  }, [titles, meta, collections, query, kind, year, tag, collectionFilter]);

  if (titles.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-border p-10 text-center">
        <p className="mb-4 text-muted">Your library is empty.</p>
        <button onClick={onAddSource} className="min-h-12 rounded-xl bg-accent px-5 font-medium text-white dark:text-bg">
          Add a web folder
        </button>
      </div>
    );
  }

  const kinds: { id: KindFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: "film", label: "Films" },
    { id: "show", label: "TV shows" },
  ];

  return (
    <section>
      <div className="mb-4 space-y-3">
        <input
          type="search"
          placeholder="Search titles, tags or file names"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          className="min-h-12 w-full rounded-xl border border-border bg-surface px-4 text-base outline-none focus:border-accent"
          aria-label="Search"
        />
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl bg-surface-2 p-1">
            {kinds.map((k) => (
              <button
                key={k.id}
                onClick={() => setKind(k.id)}
                className={`min-h-9 rounded-lg px-3 text-sm ${kind === k.id ? "bg-surface shadow-sm" : "text-muted"}`}
              >
                {k.label}
              </button>
            ))}
          </div>
          <select value={year} onChange={(e) => setYear(e.target.value)} className={selectClass} aria-label="Year">
            <option value="">Any year</option>
            {years.map((y) => (
              <option key={y} value={y}>
                {y}
              </option>
            ))}
          </select>
          <select value={tag} onChange={(e) => setTag(e.target.value)} className={selectClass} aria-label="Tag">
            <option value="">Any tag</option>
            {allTags.map((t) => (
              <option key={t} value={t}>
                {t}
              </option>
            ))}
          </select>
          <select
            value={collectionFilter ?? ""}
            onChange={(e) => onCollectionFilter(e.target.value || null)}
            className={selectClass}
            aria-label="Collection"
          >
            <option value="">Any collection</option>
            {collections.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <span className="ml-auto text-sm text-muted">
            {visible.length} of {titles.length}
          </span>
        </div>
      </div>

      {visible.length === 0 ? (
        <p className="py-10 text-center text-muted">Nothing matches these filters.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((t) => {
            const tags = meta[t.key]?.tags ?? [];
            return (
              <li key={t.key}>
                <button
                  onClick={() => onOpen(t.key)}
                  className="flex h-full min-h-24 w-full flex-col rounded-2xl border border-border bg-surface p-4 text-left transition-transform active:scale-[0.99]"
                >
                  <span className="flex w-full items-start justify-between gap-2">
                    <span className="font-medium leading-snug">{t.name}</span>
                    <span className="shrink-0 rounded-md bg-surface-2 px-2 py-0.5 text-xs text-muted">
                      {t.kind === "film" ? "Film" : "TV"}
                    </span>
                  </span>
                  <span className="mt-1 text-sm text-muted">
                    {t.year ? `${t.year} · ` : ""}
                    {summary(t)}
                  </span>
                  {tags.length > 0 && (
                    <span className="mt-2 flex flex-wrap gap-1">
                      {tags.map((tg) => (
                        <span key={tg} className="rounded-full bg-accent-soft px-2 py-0.5 text-xs">
                          {tg}
                        </span>
                      ))}
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
