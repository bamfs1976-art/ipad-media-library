import { cleanFileName, cleanFolderName, isSeasonFolder, seasonFromFolder } from "./nameCleaner.ts";
import type { MediaFile, Title } from "./types.ts";

export const MEDIA_EXTENSIONS = new Set([
  "mp4", "mkv", "avi", "mov", "m4v", "webm", "wmv", "flv", "mpg", "mpeg", "ts", "m2ts", "vob", "3gp",
]);

export function isMediaFile(name: string): boolean {
  const ext = /\.(\w{2,4})$/.exec(name)?.[1]?.toLowerCase();
  return !!ext && MEDIA_EXTENSIONS.has(ext);
}

function normalise(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim();
}

// Closest folder above the file that is not a season or specials folder.
function showFolder(folders: string[]): string | undefined {
  for (let i = folders.length - 1; i >= 0; i--) {
    if (!isSeasonFolder(folders[i])) return folders[i];
  }
  return undefined;
}

// Groups scanned files into films and TV shows.
export function organise(files: MediaFile[]): Title[] {
  const titles = new Map<string, Title>();

  for (const file of files) {
    const clean = cleanFileName(file.rawName);
    if (clean.isSample) continue;

    const parent = file.folders[file.folders.length - 1];
    const folderSeason = parent ? seasonFromFolder(parent) : undefined;
    const inSeasonFolder = parent ? isSeasonFolder(parent) : false;
    const isEpisode = clean.episode !== undefined || inSeasonFolder;

    let name: string;
    let year: number | undefined;
    if (isEpisode) {
      const folder = showFolder(file.folders);
      const fromFolder = folder ? cleanFolderName(folder) : undefined;
      // Prefer the show folder name, since episode file names often carry episode titles.
      name = fromFolder?.title || clean.title || "Unknown show";
      year = fromFolder?.title ? fromFolder.year : clean.year;
    } else {
      name = clean.title || cleanFolderName(parent ?? file.rawName).title || file.rawName;
      year = clean.year;
    }

    const kind = isEpisode ? "show" : "film";
    // Shows group across years since episode files rarely carry one.
    const key = kind === "show" ? `show:${normalise(name)}` : `film:${normalise(name)}:${year ?? ""}`;

    let title = titles.get(key);
    if (!title) {
      title = { key, kind, name, year, sourceIds: [], files: [] };
      titles.set(key, title);
    }
    if (!title.year && year) title.year = year;
    if (!title.sourceIds.includes(file.sourceId)) title.sourceIds.push(file.sourceId);
    title.files.push({
      url: file.url,
      rawName: file.rawName,
      season: clean.season ?? folderSeason,
      episode: clean.episode,
    });
  }

  for (const t of titles.values()) {
    t.files.sort(
      (a, b) =>
        (a.season ?? 0) - (b.season ?? 0) ||
        (a.episode ?? 0) - (b.episode ?? 0) ||
        a.rawName.localeCompare(b.rawName),
    );
  }

  return [...titles.values()].sort((a, b) => a.name.localeCompare(b.name));
}
