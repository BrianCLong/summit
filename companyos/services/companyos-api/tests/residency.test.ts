import { describe, it, expect } from "vitest";
import { ResidencyService } from "../src/routing/residency-service";

describe("Data Residency Service", () => {
  it("should resolve default region", () => {
    const service = ResidencyService.getInstance();
    expect(service.resolveRegion("tenant-1", "any")).toBe("us");
  });

  it("should respect tenant policy and overrides", () => {
    const service = ResidencyService.getInstance();
    service.setPolicy({
      tenant_id: "tenant-eu",
      default_region: "eu",
      overrides: { "logs": "de" }
    });

    expect(service.resolveRegion("tenant-eu", "customers")).toBe("eu");
    expect(service.resolveRegion("tenant-eu", "logs")).toBe("de");
  });

  it("should provide correct storage selector", () => {
    const service = ResidencyService.getInstance();
    expect(service.getStorageSelector("tenant-eu", "logs")).toBe("db.de.companyos.local");
  });
});
