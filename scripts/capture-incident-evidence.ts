#!/usr/bin/env -S npx tsx

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { IncidentManager } from "../server/src/ops/incident/incident-manager.js";

// Minimal polyfill for __dirname in ESM
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const args = process.argv.slice(2);

// Handle --incident-id=VAL and --incident-id VAL
let incidentId = `INC-${Date.now()}`;
const idIndex = args.indexOf("--incident-id");
if (idIndex > -1 && args[idIndex + 1]) {
  incidentId = args[idIndex + 1];
} else {
  const idArg = args.find((a) => a.startsWith("--incident-id="));
  if (idArg) {
    incidentId = idArg.split("=")[1];
  }
}

console.log(`Creating evidence bundle for ${incidentId}...`);

// Use the shared IncidentManager
const manager = IncidentManager.getInstance();

manager
  .captureSnapshot({
    incidentId,
    severity: "SEV-3", // Default, assumes user updates later
    description: "Post-incident evidence capture via script",
    triggeredBy: process.env.USER || "unknown",
  })
  .then((snapshotPath) => {
    console.log(`\nSUCCESS: Evidence captured at: ${snapshotPath}`);
    console.log(`\nNext steps:`);
    console.log(`1. Inspect the metadata.json and captured files.`);
    console.log(`2. Create a new postmortem using docs/ops/POSTMORTEM_TEMPLATE.md`);
    console.log(`3. Link this evidence path in the postmortem.`);
  })
  .catch((err) => {
    console.error("Failed to capture evidence:", err);
    process.exit(1);
  });
