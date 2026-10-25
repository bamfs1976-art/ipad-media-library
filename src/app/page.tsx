"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import CollectionsView from "@/components/CollectionsView";
import LibraryView from "@/components/LibraryView";
import SourcesView from "@/components/SourcesView";
import TitleSheet from "@/components/TitleSheet";
import { organise } from "@/lib/organise.ts";
import { scanSource, type ScanState } from "@/lib/scanner.ts";
import { load, remove, save } from "@/lib/storage.ts";
import type { Collection, MediaFile, Source, TitleMeta } from "@/lib/types.ts";

type Tab = "library" | "collections" | "sources";

function newId(): string {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
}

function nameFromUrl(url: string): string {
  try {
    const u = new URL(url);
    const last = u.pathname.split("/").filter(Boolean).pop();
    return last ? `${decodeURIComponent(last)} (${u.hostname})` : u.hostname;
  } catch {
    return url;
  }
}

export default function Home() {
  const [tab, setTab] = useState<Tab>("library");
  const [ready, setReady] = useState(false);
  const [sources, setSources] = useState<Source[]>([]);
  const [files, setFiles] = useState<Record<string, MediaFile[]>>({});
  const [meta, setMeta] = useState<Record<string, TitleMeta>>({});
  const [collections, setCollections] = useState<Collection[]>([]);
  const [scan, setScan] = useState<ScanState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [openKey, setOpenKey] = useState<string | null>(null);
  const [collectionFilter, setCollectionFilter] = useState<string | null>(null);
  const abortRef = useRef<AbortController | null>(null);

  // Load saved data once.
  useEffect(() => {
    (async () => {
      try {
        const saved = await load<Source[]>("sources", []);
        const fileMap: Record<string, MediaFile[]> = {};
        for (const s of saved) fileMap[s.id] = await load<MediaFile[]>(`files:${s.id}`, []);
        setSources(saved);
        setFiles(fileMap);
        setMeta(await load("meta", {}));
        setCollections(await load("collections", []));
        if (saved.length === 0) setTab("sources");
      } catch {
        setError("Could not open saved data. Private browsing turns off storage in Safari.");
      } finally {
        setReady(true);
      }
    })();
  }, []);

  const titles = useMemo(() => organise(Object.values(files).flat()), [files]);
  const allTags = useMemo(
    () => [...new Set(Object.values(meta).flatMap((m) => m.tags))].sort((a, b) => a.localeCompare(b)),
    [meta],
  );

  const updateSources = (next: Source[]) => {
    setSources(next);
    save("sources", next);
  };

  const updateMeta = (key: string, value: TitleMeta) => {
    setMeta((prev) => {
      const next = { ...prev, [key]: value };
      save("meta", next);
      return next;
    });
  };

  const updateCollections = (next: Collection[]) => {
    setCollections(next);
    save("collections", next);
  };

  const runScan = useCallback(
    async (source: Source, all: Source[]) => {
      setError(null);
      const controller = new AbortController();
      abortRef.current = controller;
      setScan({ sourceId: source.id, progress: { pagesRead: 0, queued: 1, filesFound: 0, failed: 0 } });
      try {
        const result = await scanSource(
          source.id,
          source.url,
          (progress) => setScan({ sourceId: source.id, progress }),
          controller.signal,
        );
        await save(`files:${source.id}`, result.files);
        setFiles((prev) => ({ ...prev, [source.id]: result.files }));
        const updated = all.map((s) =>
          s.id === source.id
            ? { ...s, lastScan: Date.now(), fileCount: result.files.length, failed: result.failed }
            : s,
        );
        updateSources(updated);
        if (result.hitPageLimit) {
          setError("This folder is very large. The scan stopped after 400 pages. Add a deeper folder link to scan the rest.");
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") setError((err as Error).message);
      } finally {
        setScan(null);
        abortRef.current = null;
      }
    },
    [],
  );

  const addSource = (url: string) => {
    const trimmed = url.trim();
    if (sources.some((s) => s.url === trimmed)) {
      setError("This folder is already in your list.");
      return;
    }
    const source: Source = { id: newId(), url: trimmed, name: nameFromUrl(trimmed), addedAt: Date.now(), fileCount: 0, failed: 0 };
    const next = [...sources, source];
    updateSources(next);
    runScan(source, next);
  };

  const deleteSource = (id: string) => {
    updateSources(sources.filter((s) => s.id !== id));
    setFiles((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
    remove(`files:${id}`);
  };

  const openTitle = titles.find((t) => t.key === openKey) ?? null;

  if (!ready) {
    return <main className="p-8 text-muted">Loading your library…</main>;
  }

  const tabs: { id: Tab; label: string }[] = [
    { id: "library", label: "Library" },
    { id: "collections", label: "Collections" },
    { id: "sources", label: "Sources" },
  ];

  return (
    <main className="mx-auto max-w-6xl px-4 pb-16 pt-[max(1rem,env(safe-area-inset-top))] sm:px-6">
      <header className="sticky top-0 z-20 -mx-4 mb-4 bg-bg/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h1 className="text-2xl font-semibold tracking-tight">Media Library</h1>
          <nav className="flex rounded-xl bg-surface-2 p-1" aria-label="Sections">
            {tabs.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
                className={`min-h-11 rounded-lg px-4 text-sm font-medium ${
                  tab === t.id ? "bg-surface text-text shadow-sm" : "text-muted"
                }`}
                aria-current={tab === t.id ? "page" : undefined}
              >
                {t.label}
              </button>
            ))}
          </nav>
        </div>
      </header>

      {error && (
        <div role="alert" className="mb-4 flex items-start justify-between gap-3 rounded-xl border border-danger/40 bg-surface p-3 text-sm">
          <span>{error}</span>
          <button onClick={() => setError(null)} className="min-h-8 px-2 text-muted" aria-label="Dismiss">
            ✕
          </button>
        </div>
      )}

      {tab === "library" && (
        <LibraryView
          titles={titles}
          meta={meta}
          allTags={allTags}
          collections={collections}
          collectionFilter={collectionFilter}
          onCollectionFilter={setCollectionFilter}
          onOpen={setOpenKey}
          onAddSource={() => setTab("sources")}
        />
      )}
      {tab === "collections" && (
        <CollectionsView
          collections={collections}
          titles={titles}
          onChange={updateCollections}
          onShow={(id) => {
            setCollectionFilter(id);
            setTab("library");
          }}
        />
      )}
      {tab === "sources" && (
        <SourcesView
          sources={sources}
          scan={scan}
          onAdd={addSource}
          onRescan={(s) => runScan(s, sources)}
          onCancel={() => abortRef.current?.abort()}
          onDelete={deleteSource}
        />
      )}

      {openTitle && (
        <TitleSheet
          title={openTitle}
          meta={meta[openTitle.key] ?? { tags: [] }}
          allTags={allTags}
          collections={collections}
          sources={sources}
          onMeta={(m) => updateMeta(openTitle.key, m)}
          onCollections={updateCollections}
          onClose={() => setOpenKey(null)}
        />
      )}
    </main>
  );
}
