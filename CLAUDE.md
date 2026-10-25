# CLAUDE.md

Personal web app for organising media file lists from public web folders (Apache/nginx style directory listings). Built for iPad Safari, hosted on Netlify.

## Stack
Next.js 16 (App Router), TypeScript strict, Tailwind CSS v4. No other runtime dependencies.

## Layout
- `src/app/page.tsx` app shell and all state (sources, files, tag data, collections)
- `src/app/api/list/route.ts` GET /api/list?url= reads one folder page server side and returns its entries
- `src/lib/safeFetch.ts` hardened fetch: http(s) only, blocks private and local addresses at connect time, redirect, size and time limits
- `src/lib/parseListing.ts` pulls child links out of a listing page
- `src/lib/scanner.ts` client side crawl, one /api/list call per folder (depth 5, 400 pages max)
- `src/lib/nameCleaner.ts` file and folder name cleaning, ported from argus (keep the NOTICE credit)
- `src/lib/organise.ts` groups files into films and shows
- `src/lib/storage.ts` IndexedDB key-value store; keys: `sources`, `files:<id>`, `meta`, `collections`
- `src/components/` Library, Collections, Sources screens and the title detail sheet

## Commands
`npm run dev`, `npm test` (node test runner with type stripping), `npm run build`. Run tests and build before pushing.

## Rules
- The app organises lists only. No playback or downloads.
- Never weaken the private address checks in safeFetch.ts. `ALLOW_PRIVATE_NETWORK=true` is for local testing only.
- Imports inside `src/lib` use `.ts` extensions so tests run under plain Node.
- Tag data is keyed by title key so rescans keep it.
