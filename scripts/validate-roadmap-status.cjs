#!/usr/bin/env node

const fs = require("fs");
const path = require("path");

const STATUS_FILE = path.join(__dirname, "../docs/roadmap/STATUS.json");

try {
  if (!fs.existsSync(STATUS_FILE)) {
    console.error(`Error: Roadmap status file not found at ${STATUS_FILE}`);
    process.exit(1);
  }

  const content = fs.readFileSync(STATUS_FILE, "utf8");
  const status = JSON.parse(content);

  // Validate Schema
  if (!status.last_updated) throw new Error("Missing 'last_updated'");
  if (!Array.isArray(status.initiatives)) throw new Error("'initiatives' must be an array");

  status.initiatives.forEach((initiative) => {
    if (!initiative.id) throw new Error("Initiative missing 'id'");
    if (!initiative.name) throw new Error("Initiative missing 'name'");
    if (!Array.isArray(initiative.epics)) throw new Error("Initiative 'epics' must be an array");

    initiative.epics.forEach((epic) => {
      if (!epic.id) throw new Error(`Epic in ${initiative.id} missing 'id'`);
      if (!epic.status) throw new Error(`Epic ${epic.id} missing 'status'`);
      const validStatuses = ["pending", "in-progress", "done", "blocked"];
      if (!validStatuses.includes(epic.status)) {
        throw new Error(
          `Epic ${epic.id} has invalid status '${epic.status}'. Must be one of: ${validStatuses.join(", ")}`
        );
      }
    });
  });

  console.log("✅ Roadmap status file is valid.");
} catch (error) {
  console.error(`❌ Roadmap validation failed: ${error.message}`);
  process.exit(1);
}
