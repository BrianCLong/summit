#!/usr/bin/env node
const path = require("path");
const { validateRuleFile } = require("../../services/detect/src/ruleValidator");

function printUsage() {
  console.log("Usage: ig-detect validate <rule-file.yml>");
}

const [cmd, arg] = process.argv.slice(2);

if (cmd === "validate") {
  if (!arg) {
    console.error("Error: rule file required");
    process.exit(1);
  }
  const filePath = path.resolve(process.cwd(), arg);
  const result = validateRuleFile(filePath);
  if (result.valid) {
    console.log("Rule is valid");
  } else {
    console.error("Rule is invalid:");
    for (const err of result.errors || []) {
      console.error(`- ${err}`);
    }
    process.exit(1);
  }
} else {
  printUsage();
  process.exit(1);
}
