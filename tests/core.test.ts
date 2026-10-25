import { test } from "node:test";
import assert from "node:assert/strict";
import { cleanFileName, cleanFolderName } from "../src/lib/nameCleaner.ts";
import { organise } from "../src/lib/organise.ts";
import { parseListing } from "../src/lib/parseListing.ts";
import { checkUrl, isPrivateAddress } from "../src/lib/safeFetch.ts";

test("cleans film file names", () => {
  const r = cleanFileName("The.Matrix.1999.1080p.BluRay.x264-GROUP.mkv");
  assert.equal(r.title, "The Matrix");
  assert.equal(r.year, 1999);
  assert.equal(r.extension, "mkv");
});

test("cleans episode file names", () => {
  const r = cleanFileName("Breaking.Bad.S02E05.720p.WEB-DL.mp4");
  assert.equal(r.title, "Breaking Bad");
  assert.equal(r.season, 2);
  assert.equal(r.episode, 5);
  assert.equal(cleanFileName("Show Name - 1x03.avi").episode, 3);
});

test("cleans folder names", () => {
  const r = cleanFolderName("Planet Earth (2006) [1080p]");
  assert.equal(r.title, "Planet Earth");
  assert.equal(r.year, 2006);
});

test("groups episodes into one show using the show folder", () => {
  const titles = organise([
    { url: "https://x/a/1", sourceId: "s", rawName: "S01E01.mkv", folders: ["Planet Earth (2006)", "Season 1"] },
    { url: "https://x/a/2", sourceId: "s", rawName: "S01E02.mkv", folders: ["Planet Earth (2006)", "Season 1"] },
    { url: "https://x/b", sourceId: "s", rawName: "Night.of.the.Living.Dead.1968.mp4", folders: ["Films"] },
    { url: "https://x/c", sourceId: "s", rawName: "Film.2001.sample.mkv", folders: [] },
  ]);
  assert.equal(titles.length, 2);
  const show = titles.find((t) => t.kind === "show")!;
  assert.equal(show.name, "Planet Earth");
  assert.equal(show.files.length, 2);
  const film = titles.find((t) => t.kind === "film")!;
  assert.equal(film.name, "Night of the Living Dead");
  assert.equal(film.year, 1968);
});

test("parses an Apache style listing and skips navigation", () => {
  const html = `
    <a href="?C=N;O=D">Name</a>
    <a href="/pub/">Parent Directory</a>
    <a href="Season%201/">Season 1/</a>
    <a href='film.mkv'>film.mkv</a>
    <a href="https://other.site/x.mkv">other</a>
    <a href="film.mkv">dupe</a>`;
  const entries = parseListing(html, "https://example.com/pub/show/");
  assert.deepEqual(entries, [
    { name: "Season 1", url: "https://example.com/pub/show/Season%201/", isFolder: true },
    { name: "film.mkv", url: "https://example.com/pub/show/film.mkv", isFolder: false },
  ]);
});

test("blocks private and local addresses", () => {
  for (const ip of ["127.0.0.1", "10.1.2.3", "192.168.0.10", "172.20.0.1", "169.254.169.254", "::1", "fd00::1", "::ffff:10.0.0.1"]) {
    assert.ok(isPrivateAddress(ip), ip);
  }
  assert.ok(!isPrivateAddress("8.8.8.8"));
  assert.throws(() => checkUrl("http://127.0.0.1/"));
  assert.throws(() => checkUrl("http://[::1]/"));
  assert.throws(() => checkUrl("file:///etc/passwd"));
  assert.doesNotThrow(() => checkUrl("https://example.com/media/"));
});
