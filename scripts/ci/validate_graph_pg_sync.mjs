#!/usr/bin/env node
import { spawnSync } from "node:child_process";
const args = ["packages/graph-sync-validator/dist/cli.js"];
const r = spawnSync("node", args, { stdio: "inherit" });
process.exit(r.status ?? 1);
