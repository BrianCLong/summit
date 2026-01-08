import assert from "node:assert/strict";
import { test } from "node:test";
import fs from "node:fs";
import path from "node:path";
import PolicyClient from "./index.js";

const mockResponse = (status, json) => ({
  ok: status >= 200 && status < 300,
  status,
  async json() {
    return json;
  },
});

test("listBundles issues GET and returns parsed body", async () => {
  let calledPath = "";
  const fetchImpl = async (url, init) => {
    calledPath = url;
    assert.equal(init.method, "GET");
    return mockResponse(200, { items: [] });
  };
  const client = new PolicyClient("https://api.example.com", { fetchImpl });
  const result = await client.listBundles();
  assert.deepEqual(result, { items: [] });
  assert.equal(calledPath, "https://api.example.com/api/policy/bundles");
});

test("simulatePolicy posts payload and returns decision", async () => {
  let receivedBody = "";
  const fetchImpl = async (_url, init) => {
    receivedBody = init.body;
    return mockResponse(200, { decision: "allow", bundle: { version: "2025.12.03" } });
  };
  const client = new PolicyClient("https://api.example.com", { fetchImpl });
  const payload = { input: { action: "ingest" }, bundleVersion: "2025.12.03" };
  const result = await client.simulatePolicy(payload);
  assert.equal(result.decision, "allow");
  assert.equal(JSON.parse(receivedBody).bundleVersion, "2025.12.03");
});

test("createAttestation posts payload and returns attestation id", async () => {
  let receivedBody = "";
  const fetchImpl = async (_url, init) => {
    receivedBody = init.body;
    return mockResponse(201, { attestationId: "attest-123", signerKeyId: "opa-signer-dev" });
  };
  const client = new PolicyClient("https://api.example.com", { fetchImpl });
  const payload = {
    artifactId: "policy-bundle-prod",
    artifactDigest: "sha256:abc",
    policyVersion: "2025.12.03",
  };
  const result = await client.createAttestation(payload);
  const parsed = JSON.parse(receivedBody);
  assert.equal(parsed.artifactId, "policy-bundle-prod");
  assert.equal(result.attestationId, "attest-123");
});

test("contract: OpenAPI spec includes policy and signing endpoints", () => {
  const specPath = path.resolve(process.cwd(), "openapi", "spec.yaml");
  const content = fs.readFileSync(specPath, "utf8");
  assert.match(content, /\/api\/policy\/simulations/);
  assert.match(content, /\/api\/signing\/attestations/);
  assert.match(content, /Policy bundle lifecycle/);
});
