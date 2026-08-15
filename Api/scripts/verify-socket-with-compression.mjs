/**
 * Compression middleware is a classic way to break long-polling and streaming
 * transports, and this app's chat depends on Socket.IO. This boots the same
 * combination app.js now uses — compression + Express + Socket.IO on one HTTP
 * server — and drives a real client over BOTH transports to prove the handshake
 * and message round-trip still work.
 *
 * Run with: node scripts/verify-socket-with-compression.mjs
 */

import express from "express";
import compression from "compression";
import http from "http";
import { Server } from "socket.io";
import { io as ioClient } from "socket.io-client";

const app = express();
app.use(compression());
app.use(cors);
function cors(req, res, next) {
  res.setHeader("Access-Control-Allow-Origin", "*");
  next();
}
app.use(express.json());
app.get("/api/ping", (req, res) => res.json({ ok: true }));

const server = http.createServer(app);
const ioServer = new Server(server, { cors: { origin: "*" } });

ioServer.on("connection", (socket) => {
  socket.on("send_dm", (payload) => {
    socket.emit("receive_dm", { ...payload, echoed: true });
  });
});

await new Promise((r) => server.listen(0, r));
const port = server.address().port;
const url = `http://localhost:${port}`;

let pass = 0,
  fail = 0;
const check = (name, cond, detail = "") =>
  cond
    ? (pass++, console.log(`  ok  ${name}${detail ? " — " + detail : ""}`))
    : (fail++, console.log(`FAIL  ${name}${detail ? " — " + detail : ""}`));

/** Connect over a single transport and echo a message back. */
function roundTrip(transports) {
  return new Promise((resolve) => {
    const socket = ioClient(url, { transports, forceNew: true, timeout: 8000 });
    const done = (result) => {
      socket.close();
      resolve(result);
    };
    const timer = setTimeout(() => done({ ok: false, why: "timed out" }), 8000);
    socket.on("connect", () => {
      socket.emit("send_dm", { content: "hello over " + transports.join("+") });
    });
    socket.on("receive_dm", (msg) => {
      clearTimeout(timer);
      done({ ok: msg.echoed === true, transport: socket.io.engine.transport.name });
    });
    socket.on("connect_error", (err) => {
      clearTimeout(timer);
      done({ ok: false, why: err.message });
    });
  });
}

const polling = await roundTrip(["polling"]);
check(
  "Socket.IO handshake + message round-trip over HTTP long-polling",
  polling.ok,
  polling.ok ? `transport: ${polling.transport}` : polling.why
);

const ws = await roundTrip(["websocket"]);
check(
  "Socket.IO handshake + message round-trip over websocket",
  ws.ok,
  ws.ok ? `transport: ${ws.transport}` : ws.why
);

const both = await roundTrip(["websocket", "polling"]);
check(
  "the transport list app.js actually uses still connects",
  both.ok,
  both.ok ? `transport: ${both.transport}` : both.why
);

// And the ordinary REST path still compresses alongside it.
const res = await fetch(`${url}/api/ping`, {
  headers: { "accept-encoding": "gzip" },
});
check("plain REST routes still work with compression mounted", (await res.json()).ok === true);

ioServer.close();
server.close();
console.log(`\n${pass} passed, ${fail} failed`);
process.exit(fail ? 1 : 0);
