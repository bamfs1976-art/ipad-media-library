import { NextResponse } from "next/server";
import { parseListing } from "@/lib/parseListing.ts";
import { FetchError, fetchListingPage } from "@/lib/safeFetch.ts";
import type { ListingResponse } from "@/lib/types.ts";

export const runtime = "nodejs";

// GET /api/list?url=... returns the files and folders on one web folder page.
export async function GET(request: Request) {
  const target = new URL(request.url).searchParams.get("url");
  if (!target) {
    return NextResponse.json({ error: "Missing url" }, { status: 400 });
  }

  try {
    const { url, html } = await fetchListingPage(target);
    const body: ListingResponse = { url, entries: parseListing(html, url) };
    return NextResponse.json(body);
  } catch (err) {
    const status = err instanceof FetchError ? err.status : 502;
    const message = err instanceof FetchError ? err.message : "Could not reach that folder";
    return NextResponse.json({ error: message }, { status });
  }
}
