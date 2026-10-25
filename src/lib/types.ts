export type MediaKind = "film" | "show";

// One entry from a single web folder page, returned by /api/list.
export interface ListingEntry {
  name: string;
  url: string;
  isFolder: boolean;
}

export interface ListingResponse {
  url: string;
  entries: ListingEntry[];
}

// A web folder the user added.
export interface Source {
  id: string;
  url: string;
  name: string;
  addedAt: number;
  lastScan?: number;
  fileCount: number;
  // Folders the scan failed to read.
  failed: number;
}

// One media file found during a scan.
export interface MediaFile {
  url: string;
  sourceId: string;
  rawName: string;
  // Folder names between the source root and the file.
  folders: string[];
}

export interface Episode {
  url: string;
  rawName: string;
  season?: number;
  episode?: number;
}

// A film or TV show built from one or more files.
export interface Title {
  key: string;
  kind: MediaKind;
  name: string;
  year?: number;
  sourceIds: string[];
  // Films: the file(s). Shows: every episode.
  files: Episode[];
}

// User data kept per title, separate from scans so a rescan keeps it.
export interface TitleMeta {
  tags: string[];
}

export interface Collection {
  id: string;
  name: string;
  titleKeys: string[];
}
