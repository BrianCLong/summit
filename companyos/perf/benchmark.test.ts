import { describe, it, expect, beforeAll } from "vitest";
import request from "supertest";
import app from "../services/companyos-api/src/index";
import baselines from "./baselines.json";
import { performance } from "perf_hooks";

describe("Performance Benchmarks", () => {
  it("should meet p95 latency for getCustomer", async () => {
    const iterations = 50;
    const latencies: number[] = [];

    for (let i = 0; i < iterations; i++) {
      const start = performance.now();
      await request(app)
        .get("/tenants/tenant_1/customers/cust_1")
        .set("x-tenant-id", "tenant_1");
      const end = performance.now();
      latencies.push(end - start);
    }

    latencies.sort((a, b) => a - b);
    const p95 = latencies[Math.floor(iterations * 0.95)];

    console.log(`p95 latency for getCustomer: ${p95.toFixed(2)}ms`);
    expect(p95).toBeLessThan(baselines.api.getCustomer.p95_ms);
  });
});
