#!/usr/bin/env node
import { execFileSync } from "node:child_process";

execFileSync("node", ["scripts/ci/verify_subsumption_bundle.mjs"], {
  stdio: "inherit",
});
execFileSync("node", ["scripts/evals/hybrid_eval.mjs"], {
  stdio: "inherit",
});
