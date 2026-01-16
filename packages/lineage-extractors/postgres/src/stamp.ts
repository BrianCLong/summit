import { readFileSync, writeFileSync, statSync, readdirSync } from "node:fs";
import { createHash } from "node:crypto";
import { join } from "node:path";

type Args = {
  out: string;
  sourceSha: string;
  policyHash: string;
  files: string[];
};

export function main(argv = process.argv.slice(2)): number {
  const args = parseArgs(argv);

  const filesData = args.files.map(f => {
    const buf = readFileSync(f);
    const sha = sha256Hex(buf);
    const size = statSync(f).size;
    return { path: f, sha256: sha, bytes: size };
  });

  // Deterministic sort
  filesData.sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0));

  const stamp = {
    version: 1,
    sourceSha: args.sourceSha,
    policyHash: args.policyHash,
    files: filesData
  };

  writeFileSync(args.out, JSON.stringify(stamp, null, 2) + "\n", "utf8");
  return 0;
}

function parseArgs(argv: string[]): Args {
  const m = new Map<string, string[]>();
  let currentKey = "";

  for (const a of argv) {
    if (a.startsWith("--")) {
      currentKey = a.slice(2);
      if (!m.has(currentKey)) m.set(currentKey, []);
    } else if (currentKey) {
      m.get(currentKey)?.push(a);
    }
  }

  const req = (k: string) => {
    const v = m.get(k);
    if (!v || v.length === 0) throw new Error(`missing --${k}`);
    return v[0];
  };

  return {
    out: req("out"),
    sourceSha: req("sourceSha"),
    policyHash: req("policyHash"),
    files: m.get("file") ?? []
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
