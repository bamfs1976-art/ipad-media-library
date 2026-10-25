// Turns raw file and folder names from web folder listings into tidy titles.
// Ported from argus (https://github.com/neon16bit/argus), Apache License 2.0.
// See NOTICE for attribution.

export interface CleanResult {
  title: string;
  season?: number;
  episode?: number;
  extension?: string;
  year?: number;
  isSample: boolean;
}

const ROMAN: Record<string, number> = {
  II: 2, III: 3, IV: 4, V: 5, VI: 6, VII: 7, VIII: 8, IX: 9, X: 10,
};

// Season/episode patterns, most specific first.
const SE_PATTERNS: RegExp[] = [
  /\b[Ss](\d{1,2})[\s._-]*[Ee](\d{1,3})\b/, // S01E02
  /\bSeason[\s._-]*(\d{1,2})[\s._-]*(?:Episode|Ep?\.?)[\s._-]*(\d{1,3})\b/i, // Season 1 Episode 2
  /(?<!\d)(\d{1,2})[xX](\d{2,3})(?!\d)/, // 1x02
  /\bEp(?:isode)?\.?\s*(\d{1,4})(?!\d|[pk]\b)/i, // Episode 2, Ep02
  /\b[Ee](\d{2,4})(?!\d|[pk]\b)/, // E02
  /(?:^|[\s_.-]+)-\s*(\d{1,4})(?!\d|[pk]\b|bit\b|fps\b)/, // " - 01"
  /(?<![a-zA-Z])(II|III|IV|V|VI|VII|VIII|IX|X)[\s_.-]+(\d{2,3})(?!\d|[pk]\b|bit\b)/, // Title II 05
];

const YEAR_PATTERN = /[([]?\b((?:19|20)\d{2})\b[)\]]?/;

const NOISE_PATTERNS: RegExp[] = [
  /\b(?:BD|HD|WEB)?(?:(?:480|720|1080|1440|2160)[pi]?|[248]k|\d{3,4}x\d{3,4}|F?HD|UHD|SD)\b/gi,
  /\b[xXhH]\.?26[45]\b/g,
  /\b(?:HEVC|AVC|AAC|E?AC3|DTS(?:-HD)?|FLAC|MP3|OPUS)(?:[.\s-]*[1-7]\.[01])?\b/gi,
  /\b(?:BluRay|BDRip|BRRip|HDRip|WEBRip|WEB-DL|DVDRip|HDTV|PDTV)\b/gi,
  /\b(?:5\.1|7\.1|Atmos|TrueHD|DDP?(?:5\.1|2\.0))\b/gi,
  /\b(?:HDR10|HDR|SDR|DV|BD|DoVi|Remux)\b/gi,
  /\b(?:NF|AMZN|DSNP|ATVP|HMAX|PEACOCK|CRAV)\b/gi,
  /\bMAX\b/g,
  /\s+-\s*(?=[^\s]*[a-zA-Z])[\w.]+$/g, // release group after the last " - "
  /\b(?:PROPER|REPACK|INTERNAL|EXTENDED|UNRATED|DIRECTORS\.?CUT)\b/gi,
  /\b(?:MULTI|DUAL|DUBBED|SUBBED|ESUB)(?:[\s._-]*AUDIO)?\b/gi,
  /\b(?:8|10)bit\b/gi,
];

const SEASON_FOLDER = /^(?:Season[\s._-]*|S)(\d{1,2})$/i;
const SPECIAL_FOLDER = /^(specials?|extras?|featurettes?|s00?)$/i;

function titleCase(input: string): string {
  if (!input) return input;
  // Leave mixed-case names alone, they are usually already correct.
  if (input.toLowerCase() !== input && input.toUpperCase() !== input) return input;
  return input
    .split(" ")
    .map((w) => (w ? w[0].toUpperCase() + w.slice(1).toLowerCase() : w))
    .join(" ");
}

function stripNoise(name: string): string {
  for (const p of NOISE_PATTERNS) name = name.replace(p, " ");
  return name;
}

function takeYear(name: string): { name: string; year?: number } {
  const m = YEAR_PATTERN.exec(name);
  if (!m) return { name };
  return { name: name.replace(m[0], " "), year: Number(m[1]) };
}

export function isSeasonFolder(name: string): boolean {
  return SEASON_FOLDER.test(name.trim()) || SPECIAL_FOLDER.test(name.trim());
}

export function seasonFromFolder(name: string): number | undefined {
  const m = SEASON_FOLDER.exec(name.trim());
  return m ? Number(m[1]) : undefined;
}

export function cleanFolderName(folderName: string): CleanResult {
  let { name, year } = takeYear(folderName);
  name = name.replace(/\(.*?\)|\[.*?\]|\{.*?\}/g, " ");
  name = name.replace(/\b(?:anime|tv\s+series|tv\s+show|series|show|movies|films|cartoons)\b/gi, " ");
  name = stripNoise(name);
  name = name.replace(/[._]/g, " ").replace(/\s{2,}/g, " ").trim();
  return { title: titleCase(name), year, isSample: false };
}

export function cleanFileName(rawName: string): CleanResult {
  let name = rawName;
  let extension: string | undefined;
  const ext = /\.(\w{2,4})$/.exec(name);
  if (ext) {
    extension = ext[1].toLowerCase();
    name = name.slice(0, ext.index);
  }

  const isSample = /(?:^|[._\-\s])sample$/i.test(name);

  const y = takeYear(name);
  name = y.name;

  name = name.replace(/\[.*?\]|\{.*?\}/g, " ");

  let season: number | undefined;
  let episode: number | undefined;
  for (const p of SE_PATTERNS) {
    const m = p.exec(name);
    if (!m) continue;
    if (m.length >= 3) {
      season = Number(m[1]) || ROMAN[m[1].toUpperCase()];
      episode = Number(m[2]);
    } else {
      episode = Number(m[1]);
    }
    name = name.replace(m[0], " ");
    break;
  }

  name = name.replace(/[_[\]()]/g, " ");
  name = stripNoise(name);
  name = name.replace(/\./g, " ");
  name = name.replace(/\s+-(?:\s+|\w+)/g, " ");
  name = name.replace(/\s{2,}/g, " ").trim();
  // Trailing dash left behind by "Show - S01E02"
  name = name.replace(/\s*-\s*$/, "").trim();

  return { title: titleCase(name), season, episode, extension, year: y.year, isSample };
}
