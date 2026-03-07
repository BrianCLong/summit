import { describe, it, expect, beforeAll, afterAll } from "vitest";
import request from "supertest";
import express from "express";
import * as grpc from "@grpc/grpc-js";
import * as protoLoader from "@grpc/proto-loader";
import { buildLedgerRouter, LedgerService } from "../src/service.js";
import {
  computeLedgerHash,
  generateHybridKeyPair,
  signHybrid,
} from "../src/quantum-safe-ledger.js";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { createGrpcServer } from "../src/grpc.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

function buildSignature(fact: any) {
  const hybrid = generateHybridKeyPair();
  const hash = computeLedgerHash(fact, fact.timestamp!);
  const signature = signHybrid(hash, hybrid);
  return { signature, hybrid };
}

describe("LedgerService REST and GraphQL", () => {
  const now = () => new Date("2024-01-01T00:00:00.000Z");
  const service = new LedgerService({ now });
  const app = express();
  app.use(buildLedgerRouter(service));

  it("accepts claims and exports manifests", async () => {
    const fact = {
      id: "claim-1",
      category: "intel",
      actor: "alice",
      action: "publish",
      resource: "report-1",
      payload: { classification: "secret" },
      timestamp: now().toISOString(),
    };
    const { signature } = buildSignature(fact);
    const accessToken = service.issueAccess("alice", "intel");

    const claimResp = await request(app)
      .post("/ledger/claim")
      .send({ caseId: "case-1", fact, signature, accessToken })
      .expect(201);

    expect(claimResp.body.entry.id).toBe("claim-1");

    const exportResp = await request(app).get("/ledger/export/case-1").expect(200);
    expect(exportResp.body.manifest.transforms).toHaveLength(1);
    expect(exportResp.body.manifest.ledgerHead).toBeTruthy();
  });

  it("serves GraphQL manifest and entries", async () => {
    const query = `query { prov_entries(caseId:"case-1", limit:5) { id } prov_manifest(caseId:"case-1") { caseId version merkleRoot } }`;
    const resp = await request(app).post("/graphql").send({ query }).expect(200);
    expect(resp.body.data.prov_entries.length).toBeGreaterThan(0);
    expect(resp.body.data.prov_manifest.caseId).toBe("case-1");
  });
});

describe("LedgerService gRPC", () => {
  const now = () => new Date("2024-02-02T00:00:00.000Z");
  const service = new LedgerService({ now });
  let server: grpc.Server;
  let client: any;

  beforeAll(async () => {
    await new Promise<void>((resolve) => {
      server = createGrpcServer(service, {
        bind: "0.0.0.0:0",
        onReady: (port) => {
          const protoPath = path.join(__dirname, "../src/proto/prov-ledger.proto");
          const pkgDef = protoLoader.loadSync(protoPath, {
            longs: String,
            enums: String,
            defaults: true,
          });
          const pkg = grpc.loadPackageDefinition(pkgDef) as any;
          client = new pkg.prov.Ledger(`localhost:${port}`, grpc.credentials.createInsecure());
          resolve();
        },
      });
    });
  });

  afterAll(() => {
    server.forceShutdown();
  });

  it("appends claim and exports manifest over gRPC", async () => {
    const fact = {
      id: "grpc-1",
      category: "intel",
      actor: "bob",
      action: "create",
      resource: "asset-9",
      payload: Buffer.from("{}"),
      timestamp: now().toISOString(),
    };
    const { signature } = buildSignature(fact);
    const accessToken = service.issueAccess("bob", "intel");
    const entry = await new Promise((resolve, reject) => {
      client.AppendClaim(
        { caseId: "grpc-case", fact, signature, accessToken },
        (err: any, resp: any) => {
          if (err) return reject(err);
          resolve(resp.entry);
        }
      );
    });
    expect(entry.id).toBe("grpc-1");

    const manifest = await new Promise((resolve, reject) => {
      client.ExportManifest({ caseId: "grpc-case" }, (err: any, resp: any) => {
        if (err) return reject(err);
        resolve(resp);
      });
    });
    expect(manifest.transforms?.length ?? 0).toBeGreaterThan(0);
  });
});
