import { describe, expect, it } from "vitest";

import { gatewayOpenApiContract } from "../../src/contracts/openapi.js";
import {
  buildContractBundle,
  buildMigrationGuide,
  generateClientLibraries,
  generateDeprecationNotice,
  runContractTestSuite,
} from "../../src/contracts/registry.js";
import { sdl as gatewayGraphqlSdl } from "../../src/graphql/schema.js";

describe("contract registry and devex guardrails", () => {
  const bundle = buildContractBundle({
    openapi: gatewayOpenApiContract,
    graphqlSdl: gatewayGraphqlSdl,
    version: "2025.3.0",
  });

  it("builds a stable bundle hash from the schema sources", () => {
    const nextBundle = buildContractBundle({
      openapi: gatewayOpenApiContract,
      graphqlSdl: gatewayGraphqlSdl,
      version: "2025.3.0",
    });
    expect(nextBundle.hash).toEqual(bundle.hash);
    expect(nextBundle.generatedAt).not.toEqual(bundle.generatedAt);
  });

  it("generates versioned client SDK artifacts for supported languages", () => {
    const clients = generateClientLibraries(bundle, ["typescript", "python", "go"]);
    const tsClient = clients.find((client) => client.language === "typescript");
    expect(tsClient?.files[0].contents).toContain("gateway contract 2025.3.0");
    const pyClient = clients.find((client) => client.language === "python");
    expect(pyClient?.files[0].contents).toContain("gateway contract 2025.3.0");
    const goClient = clients.find((client) => client.language === "go");
    expect(goClient?.files[0].contents).toContain("not yet supported");
  });

  it("runs contract tests for real and simulated clients", async () => {
    const openApiClients = [
      {
        name: "real-client",
        invoke: async (operationId: string) => {
          if (operationId === "searchUnified") {
            return {
              trace_id: "trace-real",
              items: [
                {
                  title: "Bridge operations",
                  source: "demo-index",
                  snippet: "Real client payload",
                  ranking_features: { bm25: 0.91 },
                },
              ],
            };
          }
          return { data: { models: [] } };
        },
      },
      {
        name: "sim-client",
        invoke: async () => ({
          trace_id: "trace-sim",
          items: [
            { title: "Bridge operations", source: "demo-index", ranking_features: { bm25: 0.9 } },
          ],
        }),
      },
    ];

    const graphqlClients = [
      {
        name: "real-graphql",
        execute: async () => ({
          data: {
            models: [
              {
                id: "gpt-4",
                family: "llm",
                license: "closed",
                modality: ["text"],
                ctx: 16000,
                local: false,
                description: "real gateway model",
              },
            ],
          },
          errors: [],
        }),
      },
      {
        name: "sim-graphql",
        execute: async () => ({
          data: {
            models: [
              {
                id: "mixtral",
                family: "llm",
                license: "apache-2.0",
                modality: ["text"],
                ctx: 8192,
                local: true,
                description: "simulated model payload",
              },
            ],
          },
          errors: [],
        }),
      },
    ];

    const report = await runContractTestSuite({
      bundle,
      openApiClients,
      graphqlClients,
    });

    expect(report.passed).toBe(true);
    expect(report.openApiResults.flat().every((result) => result.status === "passed")).toBe(true);
    expect(report.graphqlResults.flat().every((result) => result.status === "passed")).toBe(true);
  });

  it("creates deprecation notices and migration guides automatically", () => {
    const notice = generateDeprecationNotice(bundle, {
      sunsetDate: "2025-06-30",
      replacementVersion: "2025.4.0",
      channel: "email",
    });
    expect(notice).toContain("2025-06-30");
    expect(notice).toContain("2025.4.0");

    const previousOpenApi = { ...gatewayOpenApiContract, version: "2025.2.0" };
    const guide = buildMigrationGuide(bundle, previousOpenApi);
    expect(guide.title).toContain("Migration to 2025.3.0");
    expect(guide.steps.some((step) => step.includes("Regenerate client SDKs"))).toBe(true);
  });
});
