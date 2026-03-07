import { describe, it, expect, beforeEach } from "vitest";
import Ajv from "ajv/dist/2020";
import addFormats from "ajv-formats";
import * as fs from "fs";
import * as path from "path";

describe("Entity Schema Contract", () => {
  let ajv: Ajv;
  let entityValidate: any;
  let relationshipValidate: any;

  beforeEach(() => {
    ajv = new Ajv({ allErrors: true });
    addFormats(ajv);

    const entitySchemaPath = path.join(__dirname, "../../schemas/entities/entity.schema.json");
    const relationshipSchemaPath = path.join(__dirname, "../../schemas/entities/relationship.schema.json");

    const entitySchema = JSON.parse(fs.readFileSync(entitySchemaPath, "utf-8"));
    const relationshipSchema = JSON.parse(fs.readFileSync(relationshipSchemaPath, "utf-8"));

    ajv.addSchema(entitySchema, "entity.schema.json");
    ajv.addSchema(relationshipSchema, "relationship.schema.json");

    entityValidate = ajv.getSchema("entity.schema.json");
    relationshipValidate = ajv.getSchema("relationship.schema.json");
  });

  it("should validate a valid normalized entity", () => {
    const validEntity = {
      entity_id: "deterministic-hash",
      entity_type: "domain",
      canonical_name: "example.com",
      aliases: [],
      attributes: {},
      source_refs: ["123"],
      confidence: 0.97,
      valid_time: {
        start: "2025-01-01",
        end: null,
      },
    };

    const valid = entityValidate(validEntity);
    expect(valid).toBe(true);
  });

  it("should reject an invalid normalized entity without valid_time", () => {
    const invalidEntity = {
      entity_id: "deterministic-hash",
      entity_type: "domain",
      canonical_name: "example.com",
      aliases: [],
      attributes: {},
      source_refs: [],
      confidence: 0.97,
    };

    const valid = entityValidate(invalidEntity);
    expect(valid).toBe(false);
  });

  it("should validate a valid normalized relationship", () => {
    const validRelationship = {
      relationship_id: "rel-hash",
      source_entity_id: "a",
      target_entity_id: "b",
      relationship_type: "owns",
      attributes: {},
      source_refs: ["ref-1"],
      confidence: 0.9,
      valid_time: {
        start: "2024-01-01T00:00:00Z",
        end: null,
      },
    };

    const valid = relationshipValidate(validRelationship);
    expect(valid).toBe(true);
  });
});
