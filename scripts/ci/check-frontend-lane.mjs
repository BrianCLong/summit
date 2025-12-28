#!/usr/bin/env node
import process from "node:process";

const body = String(process.env.PR_BODY || "");

const lanes = [
  "Lane A — GA-Safe Enhancements",
  "Lane B — GA-Adjacent Extensions",
  "Lane C — Experimental / Preview",
  "Lane D — Governance / Compliance Evolution",
];

function escapeRegExp(value) {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function checkedCount() {
  return lanes.filter((lane) => {
    const pattern = new RegExp(`- \\[[xX]\\] ${escapeRegExp(lane)}`);
    return pattern.test(body);
  });
}

function extractField(label) {
  const pattern = new RegExp(`${label}:\\s*([^\\n\\r]+)`, "i");
  const match = body.match(pattern);
  return match ? match[1].trim() : "";
}

function isValidField(value) {
  if (!value) return false;
  if (value.includes("<!--")) return false;
  const normalized = value.trim().toLowerCase();
  if (["tbd", "todo", "n/a", "na", "-"].includes(normalized)) return false;
  if (/^\[[^\]]*\]$/.test(value)) return false;
  return value.length >= 5;
}

function fail(message) {
  console.error(`\n❌ Frontend lane gate failed: ${message}\n`);
  process.exit(1);
}

if (!body.trim()) {
  fail("PR body is empty. Declare exactly one frontend lane in the template.");
}

const selected = checkedCount();
if (selected.length === 0) {
  fail("No frontend lane selected. Choose exactly one lane.");
}

if (selected.length > 1) {
  fail(`Multiple lanes selected: ${selected.join(", ")}. Choose exactly one.`);
}

const justification = extractField("Lane Justification");
if (!isValidField(justification)) {
  fail("Lane Justification is missing or placeholder text.");
}

const reviewers = extractField("Requested Reviewers");
if (!isValidField(reviewers)) {
  fail("Requested Reviewers is missing or placeholder text.");
}

console.log(`✅ Frontend lane gate passed. Selected: ${selected[0]}`);
