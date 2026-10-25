"use client";

import { useState } from "react";
import type { Collection, Title } from "@/lib/types.ts";

interface Props {
  collections: Collection[];
  titles: Title[];
  onChange: (next: Collection[]) => void;
  onShow: (id: string) => void;
}

export default function CollectionsView({ collections, titles, onChange, onShow }: Props) {
  const [name, setName] = useState("");
  const known = new Set(titles.map((t) => t.key));

  const create = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (!trimmed) return;
    onChange([...collections, { id: Math.random().toString(36).slice(2, 10), name: trimmed, titleKeys: [] }]);
    setName("");
  };

  const rename = (c: Collection) => {
    const next = prompt("Rename collection", c.name)?.trim();
    if (next) onChange(collections.map((x) => (x.id === c.id ? { ...x, name: next } : x)));
  };

  const del = (c: Collection) => {
    if (confirm(`Delete the collection ${c.name}? The titles stay in your library.`)) {
      onChange(collections.filter((x) => x.id !== c.id));
    }
  };

  return (
    <section className="space-y-6">
      <form onSubmit={create} className="flex flex-col gap-2 rounded-2xl border border-border bg-surface p-4 sm:flex-row">
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="New collection, for example Watch next"
          className="min-h-12 flex-1 rounded-xl border border-border bg-bg px-3 text-base outline-none focus:border-accent"
          aria-label="Collection name"
        />
        <button type="submit" disabled={!name.trim()} className="min-h-12 rounded-xl bg-accent px-5 font-medium text-white disabled:opacity-50 dark:text-bg">
          Create
        </button>
      </form>

      {collections.length === 0 ? (
        <p className="text-center text-muted">No collections yet. Open any title in the Library to add it to a collection.</p>
      ) : (
        <ul className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {collections.map((c) => {
            // Titles no longer found in any source still count as saved, but are hidden from the total.
            const count = c.titleKeys.filter((k) => known.has(k)).length;
            return (
              <li key={c.id} className="flex flex-col rounded-2xl border border-border bg-surface p-4">
                <p className="font-medium">{c.name}</p>
                <p className="mb-3 text-sm text-muted">
                  {count} title{count === 1 ? "" : "s"}
                </p>
                <div className="mt-auto flex gap-2">
                  <button onClick={() => onShow(c.id)} className="min-h-11 flex-1 rounded-xl bg-accent-soft px-4 text-sm font-medium">
                    View
                  </button>
                  <button onClick={() => rename(c)} className="min-h-11 rounded-xl border border-border px-4 text-sm">
                    Rename
                  </button>
                  <button onClick={() => del(c)} className="min-h-11 rounded-xl border border-border px-4 text-sm text-danger">
                    Delete
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
