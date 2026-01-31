import test from "node:test";
import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

test("passes on good fixture", () => {
  const r = spawnSync("node", ["tools/security/verify_hono_lockfile.mjs", "tools/security/fixtures/pnpm-lock.good.yaml"]);
  assert.equal(r.status, 0, r.stderr?.toString() || "expected pass");
  assert.match(r.stdout.toString(), /OK: all detected hono versions are >= 4.11.7/);
});

test("fails on bad fixture", () => {
  const r = spawnSync("node", ["tools/security/verify_hono_lockfile.mjs", "tools/security/fixtures/pnpm-lock.bad.yaml"]);
  assert.notEqual(r.status, 0, "expected fail");
  assert.match(r.stderr.toString(), /Vulnerable hono versions found in tools\/security\/fixtures\/pnpm-lock.bad.yaml: 4.11.6 \(min 4.11.7\)/);
});
