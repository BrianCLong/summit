import { SummitClient } from "../src/client/SummitClient.js";
import {
  PolicyDecisionsClient,
  ReceiptsClient,
  type PolicyDecision,
  type ProvenanceReceipt,
} from "../src/index.js";

describe("ReceiptsClient", () => {
  const baseUrl = "https://api.summit.test";
  let client: SummitClient;
  let receipts: ReceiptsClient;

  const sampleReceipt: ProvenanceReceipt = {
    id: "receipt-123",
    version: "0.1.0",
    caseId: "case-1",
    claimIds: ["claim-1"],
    createdAt: new Date("2025-01-01T00:00:00Z").toISOString(),
    actor: {
      id: "user-1",
      role: "analyst",
      tenantId: "tenant-1",
      displayName: "Analyst One",
    },
    pipeline: {
      stage: "ingest",
      runId: "run-1",
      taskId: "task-1",
      step: "step-1",
    },
    payloadHash: "a".repeat(64),
    signature: {
      algorithm: "ed25519",
      keyId: "key-1",
      publicKey: "cHVibGljS2V5",
      value: "c2lnbmF0dXJl",
      signedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
    },
    proofs: {
      receiptHash: "b".repeat(64),
      manifestMerkleRoot: "c".repeat(64),
      claimHashes: ["d".repeat(64)],
    },
    metadata: { purpose: "unit-test" },
    redactions: [
      {
        path: "/metadata/secret",
        reason: "minimal",
        appliedAt: new Date("2025-01-01T00:00:00Z").toISOString(),
        appliedBy: "user-1",
      },
    ],
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    client = new SummitClient({ baseUrl, retries: 1 });
    receipts = new ReceiptsClient(client);
  });

  it("submits receipts to the provenance endpoint", async () => {
    const fetchMock = jest
      .spyOn(globalThis as unknown as typeof globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify({ receipt: sampleReceipt, status: "accepted" }), {
          status: 201,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response
      );

    const response = await receipts.submitReceipt(sampleReceipt);

    expect(response.receipt.id).toBe(sampleReceipt.id);
    const [url, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(url).toBe(`${baseUrl}/api/provenance/receipts`);
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify(sampleReceipt),
      })
    );
  });

  it("retrieves receipt status via GET", async () => {
    const fetchMock = jest
      .spyOn(globalThis as unknown as typeof globalThis, "fetch")
      .mockResolvedValue(
        new Response(
          JSON.stringify({ id: sampleReceipt.id, status: "recorded", receipt: sampleReceipt }),
          {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }
        ) as unknown as Response
      );

    const status = await receipts.getReceiptStatus(sampleReceipt.id);

    expect(status.status).toBe("recorded");
    const [url, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(url).toBe(`${baseUrl}/api/provenance/receipts/${sampleReceipt.id}`);
    expect(init).toEqual(expect.objectContaining({ method: "GET" }));
  });

  it("maps submission errors with status code", async () => {
    jest.spyOn(globalThis as unknown as typeof globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "failed to persist receipt" }), {
        status: 500,
        statusText: "Server Error",
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response
    );

    await expect(receipts.submitReceipt(sampleReceipt)).rejects.toMatchObject({
      status: 500,
      message: "failed to persist receipt",
    });
  });
});

describe("PolicyDecisionsClient", () => {
  const baseUrl = "https://api.summit.test";
  let client: SummitClient;
  let decisions: PolicyDecisionsClient;

  const policyDecision: PolicyDecision = {
    id: "pdec_test",
    timestamp: new Date("2025-02-01T00:00:00Z").toISOString(),
    policy: {
      package: "governance.core",
      version: "2025.02.01",
      rule: "allow_all",
    },
    input: {
      subject: { id: "user-1" },
      action: "read",
      resource: { id: "doc-1" },
    },
    result: {
      allow: true,
      reasons: ["policy matched"],
      metadata: { source: "opa" },
    },
  };

  beforeEach(() => {
    jest.restoreAllMocks();
    client = new SummitClient({ baseUrl, retries: 1 });
    decisions = new PolicyDecisionsClient(client);
  });

  it("requests policy decisions with the correct payload", async () => {
    const fetchMock = jest
      .spyOn(globalThis as unknown as typeof globalThis, "fetch")
      .mockResolvedValue(
        new Response(JSON.stringify(policyDecision), {
          status: 200,
          headers: { "Content-Type": "application/json" },
        }) as unknown as Response
      );

    const response = await decisions.requestDecision({
      input: policyDecision.input,
      policyPackage: policyDecision.policy.package,
      policyVersion: policyDecision.policy.version,
      rule: policyDecision.policy.rule,
      metadata: { correlationId: "corr-1" },
    });

    expect(response.id).toBe(policyDecision.id);
    const [url, init] = fetchMock.mock.calls[0] as [RequestInfo | URL, RequestInit];
    expect(url).toBe(`${baseUrl}/api/policy/decisions`);
    expect(init).toEqual(
      expect.objectContaining({
        method: "POST",
        body: JSON.stringify({
          input: policyDecision.input,
          policy: {
            package: policyDecision.policy.package,
            version: policyDecision.policy.version,
            rule: policyDecision.policy.rule,
          },
          metadata: { correlationId: "corr-1" },
        }),
      })
    );
  });

  it("maps policy decision errors to thrown exceptions with status", async () => {
    jest.spyOn(globalThis as unknown as typeof globalThis, "fetch").mockResolvedValue(
      new Response(JSON.stringify({ message: "policy engine unavailable" }), {
        status: 503,
        statusText: "Service Unavailable",
        headers: { "Content-Type": "application/json" },
      }) as unknown as Response
    );

    await expect(
      decisions.requestDecision({
        input: policyDecision.input,
        policyPackage: policyDecision.policy.package,
        policyVersion: policyDecision.policy.version,
      })
    ).rejects.toMatchObject({ status: 503, message: "policy engine unavailable" });
  });
});
