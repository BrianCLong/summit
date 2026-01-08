import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createSignerClient, issueAttestation, listKeys, verifyAttestation } from "./index.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const specPath = path.resolve(__dirname, "../../../openapi/spec.yaml");

const mockFetchFactory = (response) => {
  const calls = [];
  const fetchImpl = async (url, init = {}) => {
    calls.push({ url, init });
    if (response.ok === false) {
      return { ok: false, status: response.status || 500, json: async () => response.body || {} };
    }
    return {
      ok: true,
      status: response.status || 200,
      json: async () => response.body || {},
    };
  };
  return { fetchImpl, calls };
};

describe("signing sdk contract", () => {
  it("tracks signer and policy endpoints in the OpenAPI spec", () => {
    const spec = fs.readFileSync(specPath, "utf-8");
    expect(spec).toContain("/signer/attestations:");
    expect(spec).toContain("/signer/attestations/verify:");
    expect(spec).toContain("/policy/bundles/simulate:");
  });
});

describe("signing sdk client", () => {
  it("sends attestation requests with auth headers", async () => {
    const { fetchImpl, calls } = mockFetchFactory({
      status: 201,
      body: { signature: { signerId: "mc-platform-signer" } },
    });

    const payload = { subject: "policy-bundle", digest: "abc123" };
    await issueAttestation(payload, {
      fetchImpl,
      token: "secret-token",
      baseUrl: "https://api.example.com",
    });

    expect(calls[0].url).toBe("https://api.example.com/signer/attestations");
    expect(calls[0].init.headers.authorization).toBe("Bearer secret-token");
    expect(JSON.parse(calls[0].init.body)).toEqual(payload);
  });

  it("verifies envelopes via helper client with shared defaults", async () => {
    const { fetchImpl, calls } = mockFetchFactory({
      status: 200,
      body: { ok: true },
    });

    const client = createSignerClient("http://localhost:4001", { token: "shared" });
    await client.verifyAttestation({ signature: { value: "abc" } }, { fetchImpl });

    expect(calls[0].url).toBe("http://localhost:4001/signer/attestations/verify");
    expect(calls[0].init.headers.authorization).toBe("Bearer shared");
  });

  it("fails loudly when the API signals errors", async () => {
    const { fetchImpl } = mockFetchFactory({ ok: false, status: 500, body: { error: "boom" } });
    await expect(verifyAttestation({ signature: { value: "abc" } }, { fetchImpl })).rejects.toThrow(
      /500/
    );
  });

  it("round-trips listKeys requests without body payload", async () => {
    const { fetchImpl, calls } = mockFetchFactory({
      status: 200,
      body: { keys: [{ id: "mc-platform-signer", version: "v3" }] },
    });

    const response = await listKeys({ fetchImpl, baseUrl: "http://localhost:7777" });
    expect(response.keys).toHaveLength(1);
    expect(calls[0].url).toBe("http://localhost:7777/signer/keys");
    expect(calls[0].init.body).toBeUndefined();
  });
});
