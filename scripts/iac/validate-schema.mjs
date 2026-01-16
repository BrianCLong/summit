#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";

function parseArgs(argv) {
  const args = { "--iac-dir": null, "--out": null };
  for (let i = 2; i < argv.length; i++) {
    const k = argv[i];
    if (k in args) args[k] = argv[++i];
  }
  if (!args["--iac-dir"] || !args["--out"]) {
    console.error("usage: validate-schema.mjs --iac-dir <dir> --out <file>");
    process.exit(2);
  }
  return { iacDir: args["--iac-dir"], out: args["--out"] };
}

function listFiles(dir) {
  const out = [];
  const stack = [dir];
  while (stack.length) {
    const d = stack.pop();
    const entries = fs.readdirSync(d, { withFileTypes: true });
    for (const ent of entries) {
      const p = path.join(d, ent.name);
      const rel = path.relative(dir, p);
      if (rel.startsWith("artifacts") || rel.startsWith(".git")) continue;
      if (ent.isDirectory()) stack.push(p);
      else out.push(rel);
    }
  }
  out.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0)); // codepoint order
  return out;
}

function sha256File(absPath) {
  const h = crypto.createHash("sha256");
  h.update(fs.readFileSync(absPath));
  return h.digest("hex");
}

function writeAtomic(file, content) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, content);
  fs.renameSync(tmp, file);
}

function main() {
  const { iacDir, out } = parseArgs(process.argv);
  const envDir = path.join(iacDir, "env");

  const result = {
    ok: true,
    iac_dir: iacDir,
    checks: [],
    env: { present: false, required: ["dev", "stage", "prod"], found: [], missing: [], unknown: [] },
    file_inventory: [],
    policy_hash: "",
  };

  const inventory = listFiles(iacDir);
  result.file_inventory = inventory;

  // policy hash: stable, derived from inventory + file hashes for env files only
  const policyMaterial = [];
  if (fs.existsSync(envDir) && fs.statSync(envDir).isDirectory()) {
    result.env.present = true;
    const envFiles = fs.readdirSync(envDir).filter((f) => f.endsWith(".tfvars"));
    envFiles.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
    result.env.found = envFiles.map((f) => f.replace(/\.tfvars$/, ""));

    const requiredSet = new Set(result.env.required);
    const foundSet = new Set(result.env.found);

    for (const r of result.env.required) {
      if (!foundSet.has(r)) result.env.missing.push(r);
    }
    for (const f of result.env.found) {
      if (!requiredSet.has(f)) result.env.unknown.push(f);
    }

    // Basic semantic guardrails: do not allow empty file
    for (const f of envFiles) {
      const abs = path.join(envDir, f);
      const content = fs.readFileSync(abs, "utf8");
      if (!content.trim()) {
        result.ok = false;
        result.checks.push({ id: "ENV_TFVARS_NONEMPTY", ok: false, file: `env/${f}`, error: "tfvars file is empty" });
      }
      policyMaterial.push(`env/${f}:${sha256File(abs)}`);
    }

    // Require template if env/ exists
    const template = path.join(envDir, "template.tfvars");
    if (!fs.existsSync(template)) {
      result.ok = false;
      result.checks.push({ id: "ENV_TEMPLATE_PRESENT", ok: false, error: "env/template.tfvars missing" });
    } else {
      result.checks.push({ id: "ENV_TEMPLATE_PRESENT", ok: true });
      policyMaterial.push(`env/template.tfvars:${sha256File(template)}`);
    }

    if (result.env.missing.length) {
      result.ok = false;
      result.checks.push({ id: "ENV_REQUIRED_PRESENT", ok: false, missing: result.env.missing });
    } else {
      result.checks.push({ id: "ENV_REQUIRED_PRESENT", ok: true });
    }

    if (result.env.unknown.length) {
      result.ok = false;
      result.checks.push({ id: "ENV_NO_UNKNOWN", ok: false, unknown: result.env.unknown });
    } else {
      result.checks.push({ id: "ENV_NO_UNKNOWN", ok: true });
    }
  } else {
    // env dir not present -> acceptable; record
    result.checks.push({ id: "ENV_DIR_OPTIONAL", ok: true, note: "iac/env not present" });
  }

  const ph = crypto.createHash("sha256");
  policyMaterial.sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
  ph.update(policyMaterial.join("\n"));
  result.policy_hash = ph.digest("hex");

  writeAtomic(out, JSON.stringify(result, null, 2) + "\n");

  if (!result.ok) {
    process.exit(1);
  }
}

main();
