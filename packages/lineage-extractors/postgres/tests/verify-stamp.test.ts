import test from "node:test";
import assert from "node:assert/strict";
import { writeFileSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { main as stampMain } from "../src/stamp.js";
import { main as verifyMain } from "../src/verify-stamp.js";

const tmp = join(process.cwd(), "dist", "tests-tmp-verify");
mkdirSync(tmp, { recursive: true });

test("verify-stamp passes for a correct stamp", () => {
  const a = join(tmp, "a.json");
  const b = join(tmp, "b.json");
  const stamp = join(tmp, "stamp.json");

  writeFileSync(a, JSON.stringify({ a: 1 }), "utf8");
  writeFileSync(b, JSON.stringify({ b: 2 }), "utf8");

  const code1 = stampMain([
    "--out",
    stamp,
    "--sourceSha",
    "0123456789abcdef0123456789abcdef01234567",
    "--policyHash",
    "a".repeat(64),
    "--file",
    b,
    "--file",
    a
  ]);
  assert.equal(code1, 0);

  const schemaPath = join(process.cwd(), "schemas", "lineage", "lineage-stamp.schema.json");
  const code2 = verifyMain(["--stamp", stamp, "--schema", schemaPath, "--requireFilesExist", "true"]);
  assert.equal(code2, 0);

  const s = JSON.parse(readFileSync(stamp, "utf8"));
  assert.equal(s.files.length, 2);
});

test("verify-stamp fails on mismatch", () => {
  const x = join(tmp, "x.json");
  const stamp = join(tmp, "stamp2.json");

  writeFileSync(x, JSON.stringify({ x: 1 }), "utf8");

  const code1 = stampMain([
    "--out",
    stamp,
    "--sourceSha",
    "0123456789abcdef0123456789abcdef01234567",
    "--policyHash",
    "a".repeat(64),
    "--file",
    x
  ]);
  assert.equal(code1, 0);

  // mutate file after stamping
  writeFileSync(x, JSON.stringify({ x: 999 }), "utf8");

  const schemaPath = join(process.cwd(), "schemas", "lineage", "lineage-stamp.schema.json");
  const code2 = verifyMain(["--stamp", stamp, "--schema", schemaPath, "--requireFilesExist", "true"]);
  assert.equal(code2, 4);
});
