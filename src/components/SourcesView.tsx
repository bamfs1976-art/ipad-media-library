"use client";

import { useState } from "react";
import type { ScanState } from "@/lib/scanner.ts";
import type { Source } from "@/lib/types.ts";

interface Props {
  sources: Source[];
  scan: ScanState | null;
  onAdd: (url: string) => void;
  onRescan: (source: Source) => void;
  onCancel: () => void;
  onDelete: (id: string) => void;
}

function formatDate(ms?: number): string {
  if (!ms) return "Not scanned yet";
  return new Date(ms).toLocaleString("en-GB", { dateStyle: "medium", timeStyle: "short" });
}

export default function SourcesView({ sources, scan, onAdd, onRescan, onCancel, onDelete }: Props) {
  const [url, setUrl] = useState("");
  const busy = scan !== null;

  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!url.trim() || busy) return;
    onAdd(url);
    setUrl("");
  };

  return (
    <section className="space-y-6">
      <form onSubmit={submit} className="rounded-2xl border border-border bg-surface p-4">
        <label htmlFor="source-url" className="mb-2 block font-medium">
          Add a web folder
        </label>
        <p className="mb-3 text-sm text-muted">
          Paste the address of a public folder listing. The app reads the file names inside and every folder below.
        </p>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            id="source-url"
            type="url"
            inputMode="url"
            autoCapitalize="off"
            autoCorrect="off"
            placeholder="https://example.com/media/"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            className="min-h-12 flex-1 rounded-xl border border-border bg-bg px-3 text-base outline-none focus:border-accent"
          />
          <button
            type="submit"
            disabled={busy || !url.trim()}
            className="min-h-12 rounded-xl bg-accent px-5 font-medium text-white disabled:opacity-50 dark:text-bg"
          >
            Add and scan
          </button>
        </div>
      </form>

      {sources.length === 0 ? (
        <p className="text-center text-muted">No folders yet. Add one above to build your library.</p>
      ) : (
        <ul className="space-y-3">
          {sources.map((s) => {
            const scanning = scan?.sourceId === s.id;
            return (
              <li key={s.id} className="rounded-2xl border border-border bg-surface p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-medium">{s.name}</p>
                    <p className="truncate text-sm text-muted">{s.url}</p>
                    <p className="mt-1 text-sm text-muted">
                      {s.fileCount} files · {formatDate(s.lastScan)}
                      {s.failed > 0 && ` · ${s.failed} folders failed to load`}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    {scanning ? (
                      <button onClick={onCancel} className="min-h-11 rounded-xl border border-border px-4 text-sm">
                        Stop
                      </button>
                    ) : (
                      <>
                        <button
                          onClick={() => onRescan(s)}
                          disabled={busy}
                          className="min-h-11 rounded-xl border border-border px-4 text-sm disabled:opacity-50"
                        >
                          Rescan
                        </button>
                        <button
                          onClick={() => {
                            if (confirm(`Remove ${s.name}? Your tags and collections stay.`)) onDelete(s.id);
                          }}
                          disabled={busy}
                          className="min-h-11 rounded-xl border border-border px-4 text-sm text-danger disabled:opacity-50"
                        >
                          Remove
                        </button>
                      </>
                    )}
                  </div>
                </div>
                {scanning && scan && (
                  <p className="mt-3 rounded-lg bg-accent-soft p-2 text-sm" aria-live="polite">
                    Scanning… {scan.progress.pagesRead} folders read, {scan.progress.queued} waiting,{" "}
                    {scan.progress.filesFound} files found
                  </p>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
