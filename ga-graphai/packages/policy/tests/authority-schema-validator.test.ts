import { describe, expect, it } from "vitest";
import {
  loadAuthoritySchemaFromFile,
  validateAuthoritySchema,
  type AuthoritySchema,
} from "../src/index.ts";

const schemaPath = `${process.cwd()}/config/authority-schema.yaml`;

describe("authority schema validation", () => {
  it("accepts the canonical authority schema and exposes structured data", () => {
    const result = loadAuthoritySchemaFromFile(schemaPath);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
    expect(result.schema?.metadata.namespace).toBe("authority");
    expect(result.schema?.role_templates.length).toBeGreaterThan(0);
    expect(result.schema?.authorities[0]?.bindings[0]?.template).toBe("role:viewer");
  });

  it("flags missing metadata and invalid attribute definitions", () => {
    const invalidSchema: Partial<AuthoritySchema> = {
      schema_version: "",
      metadata: { namespace: "", owner: "" },
      attribute_catalog: {
        principal: [{ key: "id", type: "unsupported" as never }],
      },
      condition_language: { syntax: "" },
      role_templates: [],
      authorities: [],
    };

    const result = validateAuthoritySchema(invalidSchema as AuthoritySchema);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "schema_version must be a non-empty string",
        "metadata.namespace must be a non-empty string",
        "metadata.owner must be a non-empty string",
        "condition_language.syntax must be a non-empty string",
        "role_templates must include at least one template",
        "authorities must include at least one authority",
      ])
    );
    expect(
      result.errors.some((error) => error.includes("attribute_catalog.principal[0].type"))
    ).toBe(true);
  });

  it("requires bindings and ABAC controls to use supported shapes", () => {
    const malformed: AuthoritySchema = {
      schema_version: "1.0.0",
      metadata: { namespace: "authority", owner: "platform-auth" },
      attribute_catalog: {},
      condition_language: { syntax: "cel" },
      role_templates: [
        {
          id: "role:viewer",
          description: "test",
          grants: [
            {
              effect: "allow",
              actions: ["read"],
              resources: ["*"],
            },
          ],
        },
      ],
      authorities: [
        {
          id: "authority:test",
          description: "invalid binding",
          decision_strategy: "permit-overrides",
          inherits: [],
          bindings: [
            {
              template: "role:viewer",
              with: {},
              subjects: [],
              conditions: [{ expression: "" }],
            },
          ],
          abac_controls: [
            {
              expression: 'context.environment == "prod"',
              effect: "invalid" as never,
              when: [""],
            },
          ],
        },
      ],
    };

    const result = validateAuthoritySchema(malformed);
    expect(result.valid).toBe(false);
    expect(result.errors).toEqual(
      expect.arrayContaining([
        "authorities[0].bindings[0].subjects must include at least one subject",
        "authorities[0].bindings[0].conditions[0].expression must be a non-empty string",
        "authorities[0].abac_controls[0].effect must be allow or deny",
      ])
    );
  });
});
