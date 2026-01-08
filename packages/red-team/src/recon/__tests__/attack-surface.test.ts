import { describe, it, expect, jest } from "@jest/globals";
import { AttackSurfaceMapper } from "../attack-surface.js";

describe("AttackSurfaceMapper", () => {
  const mapper = new AttackSurfaceMapper();

  it("should discover assets including cloud resources and s3 buckets", async () => {
    const target = "example.com";
    const result = await mapper.performReconnaissance(target, {
      includeSubdomains: true,
      includeCloudAssets: true,
    });

    expect(result.organizationId).toBe(target);
    expect(result.assets.length).toBeGreaterThan(0);

    const cloudAssets = result.assets.filter((a) => a.type === "cloud-resource");
    expect(cloudAssets.length).toBeGreaterThan(0);

    // Check if S3 buckets are found (deterministic simulation)
    const s3Assets = cloudAssets.filter((a) => a.identifier.startsWith("s3://"));
    expect(s3Assets.length).toBeGreaterThan(0);
  });

  it("should identify vulnerabilities based on service versions", async () => {
    const target = "vulnerable-target.com";
    const result = await mapper.performReconnaissance(target, {
      includeServices: true,
    });

    // Check for CVE risks
    const assetsWithVulns = result.assets.filter((a) =>
      a.risks.some((r) => r.category === "vulnerability")
    );
    expect(assetsWithVulns.length).toBeGreaterThan(0);

    const cveRisk = assetsWithVulns[0].risks.find((r) => r.category === "vulnerability");
    expect(cveRisk).toBeDefined();
    expect(cveRisk?.factors[0]).toMatch(/CVE-/);
  });

  it("should generate appropriate exposures for risks", async () => {
    const target = "exposed.com";
    const result = await mapper.performReconnaissance(target, {
      includeServices: true,
      includeCloudAssets: true,
    });

    const vulnExposures = result.exposures.filter((e) => e.type === "vulnerable-service");
    expect(vulnExposures.length).toBeGreaterThan(0);
    expect(vulnExposures[0].severity).toMatch(/critical|high|medium/);
  });
});
