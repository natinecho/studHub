/**
 * Boots a throwaway Express app with the same middleware order as app.js and
 * checks that JSON responses actually come back gzipped — and by how much.
 *
 * Run with: node scripts/verify-compression.mjs
 */

import express from "express";
import compression from "compression";
import http from "http";
import { gunzipSync } from "zlib";

// A payload shaped like a real notes/posts list response.
const notes = Array.from({ length: 60 }, (_, i) => ({
  _id: `65f0a1b2c3d4e5f6a7b8c9${String(i).padStart(2, "0")}`,
  user: { _id: "65f0a1b2c3d4e5f6a7b8c900", username: "natnael" },
  title: `Lecture notes week ${i + 1}`,
  type: i % 3 === 0 ? "group" : "personal",
  tags: ["algorithms", "week" + i, "revision"],
  content:
    "<p>Dynamic programming: break the problem into overlapping subproblems " +
    "and memoise the results so each is solved once.</p>",
  createdAt: "2026-08-01T10:00:00.000Z",
  updatedAt: "2026-08-14T18:24:00.000Z",
}));

const app = express();
app.use(compression());
app.use(express.json());
app.get("/api/notes", (req, res) => res.json(notes));
// Below compression's 1kb default threshold — should be sent as-is.
app.get("/api/small", (req, res) => res.json({ message: "ok" }));

const server = http.createServer(app);
await new Promise((r) => server.listen(0, r));
const port = server.address().port;

function get(path, headers = {}) {
  return new Promise((resolve, reject) => {
    const req = http.request(
      { port, path, headers },
      (res) => {
        const chunks = [];
        res.on("data", (c) => chunks.push(c));
        res.on("end", () =>
          resolve({ headers: res.headers, body: Buffer.concat(chunks) })
        );
      }
    );
    req.on("error", reject);
    req.end();
  });
}

let pass = 0,
  fail = 0
const check = (name, cond, detail = "") =>
  cond
    ? (pass++, console.log(`  ok  ${name}${detail ? " — " + detail : ""}`))
    : (fail++, console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`))

const plain = await get("/api/notes")
const gzipped = await get("/api/notes", { "accept-encoding": "gzip" })
const small = await get("/api/small", { "accept-encoding": "gzip" })

const raw = plain.body.length
const sent = gzipped.body.length
const ratio = (raw / sent).toFixed(1)

console.log(`\nlist response: ${raw} bytes plain -> ${sent} bytes gzipped (${ratio}x smaller)\n`)

check(
  "a gzip-capable client gets a gzipped body",
  gzipped.headers["content-encoding"] === "gzip"
)
check(
  "the gzipped body decodes back to exactly the original JSON",
  gunzipSync(gzipped.body).toString() === plain.body.toString()
)
check("compression meaningfully shrinks a list response", sent < raw / 3, `${ratio}x`)
check(
  "a client that cannot gzip still gets plain JSON",
  plain.headers["content-encoding"] === undefined &&
    JSON.parse(plain.body.toString()).length === 60
)
check(
  "small responses are left uncompressed (below threshold)",
  small.headers["content-encoding"] === undefined
)
check(
  "Vary: Accept-Encoding is set so caches do not mix the two up",
  String(gzipped.headers["vary"] ?? "").toLowerCase().includes("accept-encoding")
)

server.close()
console.log(`\n${pass} passed, ${fail} failed`)
process.exit(fail ? 1 : 0)
