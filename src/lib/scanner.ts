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

async function listPage(url: string, signal?: AbortSignal): Promise<ListingResponse> {
  const res = await fetch(`/api/list?url=${encodeURIComponent(url)}`, { signal });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ?? "Could not read folder");
  return data as ListingResponse;
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
