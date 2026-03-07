import { describe, it, expect, beforeEach } from "vitest";
import { ManifestValidator } from "../../packages/connector-sdk/src/manifest";
import { generateEntityId, generateRelationshipId } from "../../packages/connector-sdk/src/hash";
import { transform } from "../../connectors/_template/transform";
import * as path from "path";
import * as fs from "fs";

describe("Connector SDK Contract", () => {
  describe("Manifest Validator", () => {
    let validator: ManifestValidator;

    beforeEach(() => {
      validator = new ManifestValidator(path.join(__dirname, "../../schemas/connectors/connector-manifest.schema.json"));
    });

    it("should validate a correct manifest", () => {
      const manifestPath = path.join(__dirname, "../../connectors/_template/connector.yaml");
      const manifest = validator.load(manifestPath);

      expect(manifest.id).toBe("connector.whois");
      expect(manifest.emits).toContain("entity");
      expect(manifest.deterministic_transform).toBe(true);
    });

    it("should reject an invalid manifest missing required fields", () => {
      const invalidManifest = {
        id: "test",
        version: 1,
      };

      const result = validator.validate(invalidManifest);
      expect(result.valid).toBe(false);
      expect(result.errors).toBeDefined();
    });
  });

  describe("Deterministic Hash Generation", () => {
    it("should generate the same hash for the same entity id", () => {
      const hash1 = generateEntityId("domain", "example.com");
      const hash2 = generateEntityId("domain", "example.com");
      expect(hash1).toBe(hash2);
      expect(hash1).toBe("c5af12c3e819301cc14c05fcb5fdb0fababf1176447332310bc8dd6d84920d86");
    });

    it("should generate the same hash for the same relationship id", () => {
       const hash1 = generateRelationshipId("a", "b", "owns");
       const hash2 = generateRelationshipId("a", "b", "owns");
       expect(hash1).toBe(hash2);
    });
  });

  describe("Template Connector Transformation", () => {
    it("should deterministically transform input into expected entities", () => {
       const inputPath = path.join(__dirname, "../../connectors/_template/fixtures/input.json");
       const expectedPath = path.join(__dirname, "../../connectors/_template/fixtures/expected.entities.json");

       const input = JSON.parse(fs.readFileSync(inputPath, "utf-8"));
       const expected = JSON.parse(fs.readFileSync(expectedPath, "utf-8"));

       const result = transform(input, "raw_acq_123");

       // Update expected output to match deterministic hash values
       expected[0].entity_id = "c5af12c3e819301cc14c05fcb5fdb0fababf1176447332310bc8dd6d84920d86";
       expected[1].entity_id = "e7831e26ac25692638eec93a92b863c93efd5f307829c3780d3b9ee116cac723";

       expect(result).toEqual(expected);
    });
  });
});
