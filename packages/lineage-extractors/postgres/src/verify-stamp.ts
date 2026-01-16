import { readFileSync, statSync, existsSync } from "node:fs";
import { createHash } from "node:crypto";
import Ajv from "ajv";
import addFormats from "ajv-formats";

type Args = {
  stamp: string;
  schema: string;
  requireFilesExist?: boolean;
};

type Stamp = {
  version: 1;
  sourceSha: string;
  policyHash: string;
  files: Array<{ path: string; sha256: string; bytes: number }>;
};

export function main(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);

  const stamp = JSON.parse(readFileSync(args.stamp, "utf8")) as Stamp;
  const schema = JSON.parse(readFileSync(args.schema, "utf8"));

  const ajv = new Ajv({ allErrors: true, strict: false });
  addFormats(ajv);
  const validate = ajv.compile(schema);

  const ok = validate(stamp);
  if (!ok) {
    console.error("STAMP_SCHEMA_INVALID");
    console.error(JSON.stringify(validate.errors ?? [], null, 2));
    return 2;
  }

  // Deterministic ordering constraint: files must be sorted by path codepoint
  const sorted = stamp.files.slice().sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));
  for (let i = 0; i < stamp.files.length; i++) {
    if (stamp.files[i].path !== sorted[i].path) {
      console.error("STAMP_FILES_NOT_SORTED");
      console.error(JSON.stringify({ expected: sorted[i].path, got: stamp.files[i].path }, null, 2));
      return 3;
    }
  }

  // Verify each file hash + size
  let mismatches = 0;
  for (const f of stamp.files) {
    const p = f.path;
    const present = existsSync(p);
    if (!present) {
      if (args.requireFilesExist) {
        console.error(`STAMP_FILE_MISSING: ${p}`);
        mismatches++;
      }
      continue;
    }

    const buf = readFileSync(p);
    const bytes = statSync(p).size;
    const sha = sha256Hex(buf);

    if (bytes !== f.bytes || sha !== f.sha256) {
      console.error(`STAMP_MISMATCH: ${p}`);
      console.error(JSON.stringify({ expected: { bytes: f.bytes, sha256: f.sha256 }, got: { bytes, sha256: sha } }, null, 2));
      mismatches++;
    }
  }

  if (mismatches > 0) return 4;
  return 0;
}

function parseArgs(argv: string[]): Args {
  const m = new Map<string, string>();
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (!a.startsWith("--")) continue;
    const k = a.slice(2);
    const v = argv[i + 1] ?? "";
    m.set(k, v);
    i++;
  }
  const req = (k: string) => {
    const v = m.get(k);
    if (!v) throw new Error(`missing --${k}`);
    return v;
  };
  return {
    stamp: req("stamp"),
    schema: req("schema"),
    requireFilesExist: m.get("requireFilesExist") === "true"
  };
}

function sha256Hex(input: Buffer): string {
  return createHash("sha256").update(input).digest("hex");
}

if (import.meta.url === `file://${process.argv[1]}`) {
  try {
    process.exit(main());
  } catch (e: any) {
    console.error(String(e?.message ?? e));
    process.exit(2);
  }
}
