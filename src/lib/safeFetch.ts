import dns from "node:dns";
import http from "node:http";
import https from "node:https";
import net from "node:net";

const MAX_BYTES = 3 * 1024 * 1024;
const TIMEOUT_MS = 15_000;
const MAX_REDIRECTS = 3;

export class FetchError extends Error {
  status: number;
  constructor(message: string, status = 502) {
    super(message);
    this.status = status;
  }
}

function isPrivateIPv4(ip: string): boolean {
  const [a, b] = ip.split(".").map(Number);
  return (
    a === 0 ||
    a === 10 ||
    a === 127 ||
    (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) ||
    (a === 172 && b >= 16 && b <= 31) ||
    (a === 192 && b === 168) ||
    (a === 198 && (b === 18 || b === 19)) ||
    a >= 224
  );
}

// For local testing only. Never set this on the hosted site.
const allowPrivate = () => process.env.ALLOW_PRIVATE_NETWORK === "true";

export function isPrivateAddress(ip: string): boolean {
  if (net.isIPv4(ip)) return isPrivateIPv4(ip);
  const lower = ip.toLowerCase();
  const mapped = /^::ffff:(\d+\.\d+\.\d+\.\d+)$/.exec(lower);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return (
    lower === "::" ||
    lower === "::1" ||
    lower.startsWith("fc") ||
    lower.startsWith("fd") ||
    lower.startsWith("fe8") ||
    lower.startsWith("fe9") ||
    lower.startsWith("fea") ||
    lower.startsWith("feb")
  );
}

// Resolves the host and refuses private addresses. Runs at connect time,
// so a DNS answer cannot change between the check and the connection.
const safeLookup: net.LookupFunction = (hostname, options, callback) => {
  dns.lookup(hostname, { ...options, all: true }, (err, addresses) => {
    if (err) return callback(err, "", 4);
    const list = addresses as dns.LookupAddress[];
    const blocked = !allowPrivate() && list.find((a) => isPrivateAddress(a.address));
    if (blocked || list.length === 0) {
      return callback(new FetchError("Private and local network addresses are not allowed", 400), "", 4);
    }
    if ((options as dns.LookupOptions).all) return callback(null, list as never);
    callback(null, list[0].address, list[0].family);
  });
};

function requestOnce(url: URL): Promise<{ status: number; location?: string; body: string }> {
  return new Promise((resolve, reject) => {
    const client = url.protocol === "https:" ? https : http;
    const req = client.get(
      url,
      {
        lookup: safeLookup,
        timeout: TIMEOUT_MS,
        headers: { "user-agent": "ipad-media-library/0.1", accept: "text/html,*/*;q=0.5" },
      },
      (res) => {
        const status = res.statusCode ?? 0;
        if (status >= 300 && status < 400) {
          res.resume();
          return resolve({ status, location: res.headers.location, body: "" });
        }
        const type = res.headers["content-type"] ?? "";
        if (status === 200 && type && !/html|text\/plain/i.test(type)) {
          res.destroy();
          return reject(new FetchError("This link is a file, not a folder listing", 400));
        }
        let size = 0;
        const chunks: Buffer[] = [];
        res.on("data", (chunk: Buffer) => {
          size += chunk.length;
          if (size > MAX_BYTES) {
            res.destroy();
            reject(new FetchError("Folder page is too large to read"));
            return;
          }
          chunks.push(chunk);
        });
        res.on("end", () => resolve({ status, body: Buffer.concat(chunks).toString("utf8") }));
        res.on("error", reject);
      },
    );
    req.on("timeout", () => req.destroy(new FetchError("The folder took too long to respond", 504)));
    req.on("error", reject);
  });
}

export function checkUrl(raw: string): URL {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new FetchError("That does not look like a web address", 400);
  }
  if (url.protocol !== "http:" && url.protocol !== "https:") {
    throw new FetchError("Only http and https links are supported", 400);
  }
  if (url.username || url.password) {
    throw new FetchError("Links with a username or password are not supported", 400);
  }
  // Node skips the lookup step for raw IP addresses, so check those here.
  const host = url.hostname.replace(/^\[|\]$/g, "");
  if (!allowPrivate() && net.isIP(host) && isPrivateAddress(host)) {
    throw new FetchError("Private and local network addresses are not allowed", 400);
  }
  return url;
}

// Fetches a web folder page, following a few redirects, with every hop checked.
export async function fetchListingPage(raw: string): Promise<{ url: string; html: string }> {
  let url = checkUrl(raw);
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const res = await requestOnce(url);
    if (res.location) {
      url = checkUrl(new URL(res.location, url).toString());
      continue;
    }
    if (res.status === 429) throw new FetchError("The folder server asked to slow down", 429);
    if (res.status !== 200) throw new FetchError(`The folder replied with error ${res.status}`);
    return { url: url.toString(), html: res.body };
  }
  throw new FetchError("Too many redirects");
}
