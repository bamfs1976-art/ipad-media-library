import type { ListingEntry } from "./types.ts";

const HREF_PATTERN = /<a\s[^>]*?href\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+))/gi;

function isNavigationLink(href: string): boolean {
  return (
    !href ||
    href.startsWith("#") ||
    href.startsWith("?") || // Apache sort links like ?C=N;O=D
    /^(?:mailto|javascript|data):/i.test(href) ||
    href === "../" ||
    href === "./" ||
    href === "/"
  );
}

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function lastSegment(path: string): string {
  const parts = path.split("/").filter(Boolean);
  const raw = parts[parts.length - 1] ?? "";
  try {
    return decodeURIComponent(raw);
  } catch {
    return raw;
  }
}

// Pulls the child files and folders out of a web folder page (Apache, nginx, lighttpd, IIS style).
// Only links below the page itself count, so parent folders and other sites are skipped.
export function parseListing(html: string, pageUrl: string): ListingEntry[] {
  const page = new URL(pageUrl);
  const basePath = page.pathname.endsWith("/") ? page.pathname : page.pathname + "/";
  const seen = new Set<string>();
  const entries: ListingEntry[] = [];

  for (const m of html.matchAll(HREF_PATTERN)) {
    const href = decodeEntities((m[1] ?? m[2] ?? m[3] ?? "").trim());
    if (isNavigationLink(href)) continue;

    let resolved: URL;
    try {
      resolved = new URL(href, page.origin + basePath);
    } catch {
      continue;
    }
    // Some servers link to their own folders over http from an https page, so compare hosts only.
    if (resolved.host !== page.host || !/^https?:$/.test(resolved.protocol)) continue;
    if (!resolved.pathname.startsWith(basePath) || resolved.pathname === basePath) continue;

    resolved.protocol = page.protocol;
    resolved.hash = "";
    resolved.search = "";
    const url = resolved.toString();
    if (seen.has(url)) continue;
    seen.add(url);

    const name = lastSegment(resolved.pathname);
    if (!name) continue;
    entries.push({ name, url, isFolder: resolved.pathname.endsWith("/") });
  }

  return entries;
}
