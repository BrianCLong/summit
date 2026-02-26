import { mkdtemp, readFile, rm } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import Ajv2020 from "ajv/dist/2020.js";
import addFormats from "ajv-formats";
import { writeEvidenceBundle } from "../../src/graphrag/evidence/writer.js";
import type { EvidenceEntry } from "../../src/graphrag/evidence/types.js";

async function loadJson(relativePath: string): Promise<unknown> {
  const raw = await readFile(path.join(process.cwd(), relativePath), "utf8");
  return JSON.parse(raw) as unknown;
}

async function validateFixtures(): Promise<void> {
  const ajv = new Ajv2020({ allErrors: true, strict: false });
  addFormats(ajv);

  const files = ["index", "report", "metrics", "stamp"] as const;
  for (const file of files) {
    const schema = await loadJson(`docs/api/schemas/evidence/${file}.schema.json`);
    const positive = await loadJson(`tests/fixtures/evidence/positive/${file}.json`);
    const negative = await loadJson(`tests/fixtures/evidence/negative/${file}.json`);
    const validate = ajv.compile(schema);
    if (!validate(positive)) {
      throw new Error(`Positive fixture failed schema ${file}`);
    }
    if (validate(negative)) {
      throw new Error(`Negative fixture unexpectedly passed schema ${file}`);
    }
  }
}

async function validateDeterminism(): Promise<void> {
  const entries: EvidenceEntry[] = [
    {
      report: {
        evidence_id: "EVD-cogops-feb2026-CIB-001",
        classification: "INTERNAL",
        summary: "coordination feature report",
      },
      metrics: { evidence_id: "EVD-cogops-feb2026-CIB-001", metrics: { burstiness: 0.77 } },
      stamp: { evidence_id: "EVD-cogops-feb2026-CIB-001", generated_at: "2026-02-01T00:00:00Z" },
    },
  ];

  const dir1 = await mkdtemp(path.join(os.tmpdir(), "evidence-a-"));
  const dir2 = await mkdtemp(path.join(os.tmpdir(), "evidence-b-"));

  try {
    await writeEvidenceBundle(entries, { baseDir: dir1 });
    await writeEvidenceBundle(entries, { baseDir: dir2 });

    const files = [
      "index.json",
      "EVD-cogops-feb2026-CIB-001/report.json",
      "EVD-cogops-feb2026-CIB-001/metrics.json",
    ];
    for (const file of files) {
      const one = await readFile(path.join(dir1, file), "utf8");
      const two = await readFile(path.join(dir2, file), "utf8");
      if (one !== two) {
        throw new Error(`Non-deterministic output detected for ${file}`);
      }
    }
  } finally {
    await rm(dir1, { recursive: true, force: true });
    await rm(dir2, { recursive: true, force: true });
  }
}

async function main(): Promise<void> {
  await validateFixtures();
  await validateDeterminism();
  process.stdout.write("evidence verification passed\n");
}

void main();
