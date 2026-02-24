#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import Ajv from "ajv/dist/2020.js";

const root = process.cwd();
const regPath = path.join(root, "docs/ga/policy_registry.json");
const schemaPath = path.join(root, "schemas/ga/policy_registry.schema.json");

const ajv = new Ajv({ allErrors: true, strict: true });
const schema = JSON.parse(fs.readFileSync(schemaPath, "utf8"));
const validate = ajv.compile(schema);

const registry = JSON.parse(fs.readFileSync(regPath, "utf8"));
if (!validate(registry)) {
  console.error("❌ policy_registry.json failed schema validation");
  console.error(validate.errors);
  process.exit(1);
}

for (const p of registry.policies) {
  for (const wf of p.workflows) {
    if (!wf.check_name.includes(":")) {
      console.error(`❌ check_name must be namespaced: ${wf.check_name}`);
      process.exit(1);
    }
    if (!wf.evidence_id.startsWith("evidence.")) {
      console.error(`❌ evidence_id must start with 'evidence.': ${wf.evidence_id}`);
      process.exit(1);
    }
  }
}

console.log("✅ policy_registry.json OK");
