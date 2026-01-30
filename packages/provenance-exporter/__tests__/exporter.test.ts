import { ProvExporter } from "../src/prov-exporter";

describe("ProvExporter", () => {
  it("should create a valid PROV document structure", () => {
    const exporter = new ProvExporter();

    exporter.addEntity("entity:1");
    exporter.addAgent("agent:1");
    exporter.addActivity("activity:1");

    exporter.addWasGeneratedBy("entity:1", "activity:1");

    const json = exporter.getJson();

    expect(json.entity).toHaveProperty("entity:1");
    expect(json.agent).toHaveProperty("agent:1");
    expect(json.activity).toHaveProperty("activity:1");
    expect(json.wasGeneratedBy).toBeDefined();

    // Check key of wasGeneratedBy (should be deterministic based on IDs)
    const keys = Object.keys(json.wasGeneratedBy!);
    expect(keys.length).toBe(1);
    expect(keys[0]).toContain("entity_1");
    expect(keys[0]).toContain("activity_1");
  });

  it("should support custom prefixes", () => {
      const exporter = new ProvExporter({ "ex": "http://example.org/" });
      const json = exporter.getJson();
      expect(json.prefix).toHaveProperty("ex", "http://example.org/");
  });
});
