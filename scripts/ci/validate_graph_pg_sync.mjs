#!/usr/bin/env node
import { spawnSync } from "node:child_process";
const args = ["packages/graph-sync-validator/bin/graph-sync-validate.mjs"];
const r = spawnSync("node", args, { stdio: "inherit" });
process.exit(r.status ?? 1);
