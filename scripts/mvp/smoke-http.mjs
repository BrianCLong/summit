#!/usr/bin/env node
import http from "node:http";
import https from "node:https";
import { URL } from "node:url";

const target = process.env.SMOKE_URL || "http://127.0.0.1:3000/healthz";
const url = new URL(target);
const lib = url.protocol === "https:" ? https : http;

function reqOnce() {
  return new Promise((resolve, reject) => {
    const req = lib.request(
      {
        method: "GET",
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        timeout: 4000,
      },
      (res) => {
        const ok = res.statusCode && res.statusCode >= 200 && res.statusCode < 300;
        if (!ok) return reject(new Error(`HTTP ${res.statusCode}`));
        resolve();
      }
    );
    req.on("timeout", () => req.destroy(new Error("timeout")));
    req.on("error", reject);
    req.end();
  });
}

(async () => {
  await reqOnce();
})();
