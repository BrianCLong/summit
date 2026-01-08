import type { Manifest, ManifestFileEntry, ManifestTransform } from "./types.js";

export const MANIFEST_VERSION = "1.0.0";

export const manifestSchema: Record<string, unknown> = {
  $id: "https://intelgraph/schema/provenance-manifest.json",
  type: "object",
  additionalProperties: false,
  required: ["manifestVersion", "createdAt", "documents"],
  properties: {
    manifestVersion: { type: "string" },
    bundleId: { type: "string" },
    createdAt: { type: "string", format: "date-time" },
    documents: {
      type: "array",
      minItems: 1,
      items: { $ref: "#/$defs/manifestFileEntry" },
    },
    exhibits: {
      type: "array",
      items: { $ref: "#/$defs/manifestFileEntry" },
    },
    evidence: {
      type: "array",
      items: { $ref: "#/$defs/manifestFileEntry" },
    },
    transforms: {
      type: "array",
      items: { $ref: "#/$defs/manifestTransform" },
    },
    disclosure: {
      type: "object",
      required: ["audience", "redactions", "license"],
      additionalProperties: false,
      properties: {
        audience: {
          type: "object",
          required: ["policyId", "label"],
          additionalProperties: false,
          properties: {
            policyId: { type: "string" },
            label: { type: "string" },
            decision: { type: "string", enum: ["allow", "deny", "conditional"] },
          },
        },
        redactions: {
          type: "array",
          items: {
            type: "object",
            required: ["field", "path", "reason", "appliedAt"],
            additionalProperties: false,
            properties: {
              field: { type: "string" },
              path: { type: "string" },
              reason: { type: "string" },
              policyId: { type: "string" },
              appliedBy: { type: "string" },
              appliedAt: { type: "string", format: "date-time" },
            },
          },
        },
        license: {
          type: "object",
          required: ["id", "name"],
          additionalProperties: false,
          properties: {
            id: { type: "string" },
            name: { type: "string" },
            url: { type: "string" },
            notes: { type: "string" },
          },
        },
        redactionSummary: {
          type: "object",
          required: ["total", "fields"],
          additionalProperties: false,
          properties: {
            total: { type: "integer", minimum: 0 },
            fields: { type: "array", items: { type: "string" } },
          },
        },
      },
    },
    signature: {
      type: "object",
      required: ["algorithm", "keyId", "publicKey", "signature", "signedAt"],
      additionalProperties: false,
      properties: {
        algorithm: { type: "string", enum: ["ed25519"] },
        keyId: { type: "string" },
        publicKey: { type: "string" },
        signature: { type: "string" },
        signedAt: { type: "string", format: "date-time" },
      },
    },
  },
  $defs: {
    manifestFileEntry: {
      type: "object",
      required: ["id", "path", "sha256"],
      additionalProperties: false,
      properties: {
        id: { type: "string", minLength: 1 },
        path: { type: "string", minLength: 1 },
        mediaType: { type: "string" },
        role: { type: "string" },
        sha256: { type: "string", pattern: "^[a-fA-F0-9]{64}$" },
        transforms: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
        evidence: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
      },
    },
    manifestTransform: {
      type: "object",
      required: ["id", "step", "inputId", "outputId"],
      additionalProperties: false,
      properties: {
        id: { type: "string", minLength: 1 },
        description: { type: "string" },
        step: { type: "integer", minimum: 0 },
        inputId: { type: "string", minLength: 1 },
        outputId: { type: "string", minLength: 1 },
        evidenceIds: {
          type: "array",
          items: { type: "string", minLength: 1 },
        },
      },
    },
  },
};

function isHexSha(value: unknown): value is string {
  return typeof value === "string" && /^[a-fA-F0-9]{64}$/.test(value);
}

function validateFileEntry(
  entry: ManifestFileEntry,
  index: number,
  category: string,
  errors: string[]
) {
  if (!entry.id) {
    errors.push(`${category}[${index}].id is required`);
  }
  if (!entry.path || typeof entry.path !== "string") {
    errors.push(`${category}[${index}].path must be a string`);
  }
  if (!isHexSha(entry.sha256)) {
    errors.push(`${category}[${index}].sha256 must be a 64 character hex string`);
  }
  if (entry.transforms && !Array.isArray(entry.transforms)) {
    errors.push(`${category}[${index}].transforms must be an array of transform ids`);
  }
  if (entry.evidence && !Array.isArray(entry.evidence)) {
    errors.push(`${category}[${index}].evidence must be an array of evidence ids`);
  }
}

function validateTransform(transform: ManifestTransform, index: number, errors: string[]) {
  if (!transform.id) {
    errors.push(`transforms[${index}].id is required`);
  }
  if (
    typeof transform.step !== "number" ||
    !Number.isInteger(transform.step) ||
    transform.step < 0
  ) {
    errors.push(`transforms[${index}].step must be a non-negative integer`);
  }
  if (!transform.inputId) {
    errors.push(`transforms[${index}].inputId is required`);
  }
  if (!transform.outputId) {
    errors.push(`transforms[${index}].outputId is required`);
  }
}

export function validateManifestStructure(manifest: unknown): { valid: boolean; errors: string[] } {
  const errors: string[] = [];
  if (!manifest || typeof manifest !== "object") {
    return { valid: false, errors: ["Manifest must be an object"] };
  }
  const candidate = manifest as Manifest;
  if (!candidate.manifestVersion || typeof candidate.manifestVersion !== "string") {
    errors.push("manifestVersion is required");
  }
  if (!candidate.createdAt || typeof candidate.createdAt !== "string") {
    errors.push("createdAt is required and must be a string");
  }
  if (!Array.isArray(candidate.documents) || candidate.documents.length === 0) {
    errors.push("documents must be a non-empty array");
  }

  if (Array.isArray(candidate.documents)) {
    candidate.documents.forEach((doc, idx) => validateFileEntry(doc, idx, "documents", errors));
  }
  if (candidate.exhibits) {
    if (!Array.isArray(candidate.exhibits)) {
      errors.push("exhibits must be an array when provided");
    } else {
      candidate.exhibits.forEach((doc, idx) => validateFileEntry(doc, idx, "exhibits", errors));
    }
  }
  if (candidate.evidence) {
    if (!Array.isArray(candidate.evidence)) {
      errors.push("evidence must be an array when provided");
    } else {
      candidate.evidence.forEach((doc, idx) => validateFileEntry(doc, idx, "evidence", errors));
    }
  }
  if (candidate.transforms) {
    if (!Array.isArray(candidate.transforms)) {
      errors.push("transforms must be an array when provided");
    } else {
      candidate.transforms.forEach((transform, idx) => validateTransform(transform, idx, errors));
    }
  }
  if (candidate.disclosure) {
    if (!candidate.disclosure.audience?.policyId || !candidate.disclosure.audience?.label) {
      errors.push("disclosure.audience must include policyId and label");
    }
    if (!candidate.disclosure.license?.id || !candidate.disclosure.license?.name) {
      errors.push("disclosure.license must include id and name");
    }
    if (!Array.isArray(candidate.disclosure.redactions)) {
      errors.push("disclosure.redactions must be an array");
    } else {
      candidate.disclosure.redactions.forEach((redaction, idx) => {
        if (!redaction.field || !redaction.path || !redaction.reason) {
          errors.push(`disclosure.redactions[${idx}] must include field, path, and reason`);
        }
      });
    }
  }
  if (candidate.signature) {
    if (!candidate.signature.keyId || !candidate.signature.signature) {
      errors.push("signature must include keyId and signature");
    }
  }

  return { valid: errors.length === 0, errors };
}

export type ValidManifest = Manifest & { manifestVersion: typeof MANIFEST_VERSION };
