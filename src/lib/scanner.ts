import { isMediaFile } from "./organise.ts";
import type { ListingResponse, MediaFile } from "./types.ts";

export const MAX_DEPTH = 5;
export const MAX_PAGES = 400;

export interface ScanProgress {
  pagesRead: number;
  queued: number;
  filesFound: number;
  failed: number;
}

export interface ScanState {
  sourceId: string;
  progress: ScanProgress;
}

export interface ScanResult {
  files: MediaFile[];
  failed: number;
  hitPageLimit: boolean;
}

// Pause between folders so folder servers do not rate limit the scan.
const PAGE_DELAY_MS = 300;
const RETRY_DELAYS_MS = [3000, 8000];

function wait(ms: number, signal?: AbortSignal): Promise<void> {
  return new Promise((resolve, reject) => {
    const timer = setTimeout(resolve, ms);
    signal?.addEventListener("abort", () => {
      clearTimeout(timer);
      reject(new DOMException("Scan cancelled", "AbortError"));
    }, { once: true });
  });
}

async function listPage(url: string, signal?: AbortSignal): Promise<ListingResponse> {
  for (let attempt = 0; ; attempt++) {
    const res = await fetch(`/api/list?url=${encodeURIComponent(url)}`, { signal });
    const data = await res.json();
    if (res.ok) return data as ListingResponse;
    // The folder server asked us to slow down, so wait and try again.
    if (res.status === 429 && attempt < RETRY_DELAYS_MS.length) {
      await wait(RETRY_DELAYS_MS[attempt], signal);
      continue;
    }
    throw new Error(data.error ?? "Could not read folder");
  }
}

// Walks a web folder and every folder below it, collecting media files.
export async function scanSource(
  sourceId: string,
  rootUrl: string,
  onProgress: (p: ScanProgress) => void,
  signal?: AbortSignal,
): Promise<ScanResult> {
  const root = rootUrl.endsWith("/") ? rootUrl : rootUrl + "/";
  const queue: { url: string; folders: string[]; depth: number }[] = [{ url: root, folders: [], depth: 0 }];
  const visited = new Set<string>();
  const files: MediaFile[] = [];
  let failed = 0;
  let pagesRead = 0;

  while (queue.length && pagesRead < MAX_PAGES) {
    if (signal?.aborted) throw new DOMException("Scan cancelled", "AbortError");
    const next = queue.shift()!;
    if (visited.has(next.url)) continue;
    visited.add(next.url);
    if (pagesRead > 0) await wait(PAGE_DELAY_MS, signal);

    try {
      const page = await listPage(next.url, signal);
      for (const entry of page.entries) {
        if (entry.isFolder) {
          if (next.depth < MAX_DEPTH) {
            queue.push({ url: entry.url, folders: [...next.folders, entry.name], depth: next.depth + 1 });
          }
        } else if (isMediaFile(entry.name)) {
          files.push({ url: entry.url, sourceId, rawName: entry.name, folders: next.folders });
        }
      }
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      // The root folder failing means the whole scan failed.
      if (next.depth === 0) throw err;
      failed++;
    }

    pagesRead++;
    onProgress({ pagesRead, queued: queue.length, filesFound: files.length, failed });
  }

  return { files, failed, hitPageLimit: queue.length > 0 };
}
