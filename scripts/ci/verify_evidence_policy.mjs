import fs from "node:fs";
import path from "node:path";
import { createRequire } from "node:module";
import { verifyMinisign } from "./lib/minisign.mjs";
import { parseArgs } from "./lib/args.mjs";

const require = createRequire(import.meta.url);
let yaml;
try {
  yaml = require("js-yaml");
} catch (e) {
  // Minimal fallback parser
  yaml = {
    load: (str) => {
       const res = { allowed_ids: [], public_keys: [], waivers: [] };
       let currentKey = null;
       const lines = str.split('\n');
       for (const line of lines) {
           const t = line.trim();
           if (!t || t.startsWith('#')) continue;

           // List item
           if (t.startsWith('- ')) {
               const val = t.slice(2).trim();
               if (currentKey === 'allowed_ids') res.allowed_ids.push(val);
               if (currentKey === 'public_keys') res.public_keys.push(val);
               if (currentKey === 'waivers') {
                   if (val.startsWith('id: ')) {
                        res.waivers.push({ id: val.split(': ')[1].trim() });
                   }
               }
               continue;
           }

           // Key-Value or Key Start
           if (t.includes(':')) {
               const parts = t.split(':');
               const k = parts[0].trim();
               const v = parts.slice(1).join(':').trim();

               if (!v) {
                   currentKey = k;
                   if (k === 'allowed_ids') res.allowed_ids = [];
                   if (k === 'public_keys') res.public_keys = [];
                   if (k === 'waivers') res.waivers = [];
               } else {
                   let val = v;
                   if (val === 'true') val = true;
                   else if (val === 'false') val = false;
                   else if (val.startsWith('[') && val.endsWith(']')) {
                       val = val.slice(1, -1).split(',').map(s => s.trim());
                   }

                   if (k === 'id' && currentKey === 'waivers') {
                       res.waivers.push({ id: val });
                   } else {
                       res[k] = val;
                   }
               }
           }
       }
       return res;
    }
  };
}

async function main() {
  const args = parseArgs(process.argv.slice(2));

  if (!args.policy || !args.dir) {
    console.error("Usage: node verify_evidence_policy.mjs --policy <file> --dir <dir> [--waivers <file>]");
    process.exit(1);
  }

  const policy = yaml.load(fs.readFileSync(args.policy, "utf8"));
  const waivers = args.waivers ? yaml.load(fs.readFileSync(args.waivers, "utf8")) : { waivers: [] };

  const allowed = new Set(policy.allowed_ids);
  const waived = new Set((waivers.waivers || []).map(w => w.id));

  const evidenceDir = args.dir;
  if (!fs.existsSync(evidenceDir)) {
    console.error(`Evidence directory ${evidenceDir} does not exist`);
    process.exit(1);
  }

  const jsonFiles = fs.readdirSync(evidenceDir).filter(f => f.endsWith(".json"));
  const seen = new Map(); // id -> filename

  console.log(`Verifying ${jsonFiles.length} evidence files in ${evidenceDir}...`);

  for (const file of jsonFiles) {
    const p = path.join(evidenceDir, file);
    let doc;
    try {
      doc = JSON.parse(fs.readFileSync(p, "utf8"));
    } catch (e) {
      throw new Error(`Invalid JSON in ${file}: ${e.message}`);
    }

    if (!doc.id) throw new Error(`Missing 'id' in ${file}`);

    if (!allowed.has(doc.id)) {
      throw new Error(`Unknown evidence id ${doc.id} in ${file}. Allowed: ${Array.from(allowed).join(", ")}`);
    }

    if (policy.require_subject_sha256 && !doc.subject?.sha256) {
      throw new Error(`Missing subject.sha256 in ${file}`);
    }

    if (seen.has(doc.id)) {
      throw new Error(`Duplicate evidence id ${doc.id}: ${seen.get(doc.id)} and ${file}`);
    }
    seen.set(doc.id, file);

    if (policy.require_signature) {
      const sigPath = `${p}.minisig`;
      if (!fs.existsSync(sigPath)) {
        throw new Error(`Missing signature ${sigPath} for ${file}`);
      }

      const pubKeyPath = (policy.public_keys && policy.public_keys[0]) || "";
      if (!pubKeyPath) {
          throw new Error("No public key defined in policy");
      }

      // If path is relative, resolve it relative to CWD (runner logic) or check existence
      if (!fs.existsSync(pubKeyPath)) {
          // Try strictly relative to CWD
          const absPath = path.resolve(pubKeyPath);
          if (!fs.existsSync(absPath)) {
             throw new Error(`Public key not found at ${pubKeyPath} or ${absPath}`);
          }
      }

      console.log(`Verifying signature for ${file}...`);
      await verifyMinisign({ filePath: p, sigPath, pubKeyPath });
    }
  }

  // Completeness check
  if (policy.require_each_allowed_id) {
    const missing = [];
    for (const id of policy.allowed_ids) {
      if (waived.has(id)) continue;
      if (!seen.has(id)) {
        missing.push(id);
      }
    }
    if (missing.length > 0) {
      throw new Error(`Missing required evidence IDs: ${missing.join(", ")}`);
    }
  }

  console.log("✅ Evidence policy verified successfully.");
}

main().catch(err => {
  console.error(`❌ Validation Failed: ${err.message}`);
  process.exit(1);
});
