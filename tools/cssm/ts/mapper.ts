import { createHash } from "crypto";
import { readFileSync } from "fs";
import * as path from "path";

export interface CanonicalAttribute {
  name: string;
  description: string;
  classification: "entity_field" | "metric";
  entity?: string;
  semantic_type: string;
  data_type?: string;
  unit?: string;
}

export interface SchemaField {
  name: string;
  description?: string;
  data_type?: string;
}

export interface SchemaTable {
  name: string;
  fields: SchemaField[];
}

export interface SchemaSystem {
  name: string;
  tables: SchemaTable[];
}

export interface Annotation {
  source_system: string;
  source_table: string;
  field_name: string;
  canonical_target: CanonicalAttribute;
  confidence: number;
  explanation: string;
}

export interface CompatibilityRow {
  left: string;
  right: string;
  compatible: boolean;
  reason: string;
}

interface OntologyFile {
  entities: Array<{
    name: string;
    description?: string;
    fields: Array<{
      name: string;
      description?: string;
      semantic_type?: string;
      data_type?: string;
      unit?: string;
    }>;
  }>;
  metrics: Array<{
    name: string;
    description?: string;
    entity?: string;
    semantic_type?: string;
    unit?: string;
  }>;
}

const DEFAULT_DIMENSIONS = 32;

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/_/g, " ")
    .split(/\s+/)
    .filter(Boolean);
}

function deterministicEmbedding(text: string, dimensions = DEFAULT_DIMENSIONS): number[] {
  const vector = new Array<number>(dimensions).fill(0);
  const tokens = tokenize(text);
  if (tokens.length === 0) {
    return vector;
  }
  for (const token of tokens) {
    const hash = createHash("sha256").update(token).digest();
    for (let i = 0; i < dimensions; i += 1) {
      vector[i] += hash[i] / 255 - 0.5;
    }
  }
  return vector.map((value) => value / tokens.length);
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0;
  let leftNorm = 0;
  let rightNorm = 0;
  for (let i = 0; i < Math.min(left.length, right.length); i += 1) {
    dot += left[i] * right[i];
    leftNorm += left[i] * left[i];
    rightNorm += right[i] * right[i];
  }
  if (leftNorm === 0 || rightNorm === 0) {
    return 0;
  }
  return Math.max(-1, Math.min(1, dot / Math.sqrt(leftNorm * rightNorm)));
}

function canonicalAttributes(ontology: OntologyFile): CanonicalAttribute[] {
  const attributes: CanonicalAttribute[] = [];
  for (const entity of ontology.entities) {
    for (const field of entity.fields) {
      attributes.push({
        name: field.name,
        description: field.description ?? "",
        classification: "entity_field",
        entity: entity.name,
        semantic_type: field.semantic_type ?? "attribute",
        data_type: field.data_type,
        unit: field.unit,
      });
    }
  }
  for (const metric of ontology.metrics) {
    attributes.push({
      name: metric.name,
      description: metric.description ?? "",
      classification: "metric",
      entity: metric.entity,
      semantic_type: metric.semantic_type ?? "metric",
      data_type: "numeric",
      unit: metric.unit,
    });
  }
  return attributes;
}

function ruleScore(field: SchemaField, candidate: CanonicalAttribute): { score: number; explanation: string } {
  const tokens = new Set(tokenize(`${field.name} ${field.description ?? ""}`));
  const candidateTokens = new Set(tokenize(candidate.name));
  let score = 0;
  const reasons: string[] = [];

  if (field.name.toLowerCase() === candidate.name.toLowerCase()) {
    score += 0.6;
    reasons.push("EXACT_NAME");
  }
  const normalizedField = field.name.toLowerCase().replace(/_/g, "");
  const normalizedCandidate = candidate.name.toLowerCase().replace(/_/g, "");
  if (normalizedField === normalizedCandidate) {
    score += 0.4;
    reasons.push("NORMALIZED_NAME");
  }
  const overlap = [...candidateTokens].filter((token) => tokens.has(token));
  if (overlap.length > 0) {
    score += 0.2 + 0.05 * overlap.length;
    reasons.push(`TOKEN_OVERLAP(${overlap.join(",")})`);
  }
  const semanticKeywords: Record<string, string[]> = {
    identifier: ["id", "identifier", "key"],
    timestamp: ["date", "time", "timestamp"],
    amount: ["amount", "total", "value", "gmv"],
    financial: ["revenue", "amount", "gmv", "sales"],
    attribute: ["name", "status", "type"],
    contact: ["email", "phone"],
  };
  const keywords = new Set(semanticKeywords[candidate.semantic_type] ?? []);
  const keywordOverlap = [...keywords].filter((keyword) => tokens.has(keyword));
  if (keywordOverlap.length > 0) {
    score += 0.45;
    reasons.push(`SEMANTIC_KEYWORD(${keywordOverlap.join(",")})`);
  }
  if ((candidate.unit ?? "").toLowerCase() === "usd" && tokens.has("usd")) {
    score += 0.25;
    reasons.push("UNIT_MENTION");
  }

  return { score, explanation: reasons.join(", ") };
}

function blendConfidence(ruleScoreValue: number, similarity: number): number {
  const boundedRule = Math.min(ruleScoreValue, 1);
  return Math.min(1, 0.7 * boundedRule + 0.3 * similarity);
}

export function loadOntology(overrides?: string): OntologyFile {
  const base = overrides
    ? overrides
    : path.join(__dirname, "..", "data", "ontology.json");
  return JSON.parse(readFileSync(base, "utf8"));
}

export function mapSystems(systems: SchemaSystem[], ontologyPath?: string): {
  schema_annotations: Annotation[];
  compatibility_matrix: CompatibilityRow[];
} {
  const ontology = loadOntology(ontologyPath);
  const attributes = canonicalAttributes(ontology);
  const annotations: Annotation[] = [];

  const fieldEmbeddingCache = new Map<string, number[]>();

  for (const system of [...systems].sort((a, b) => a.name.localeCompare(b.name))) {
    for (const table of [...system.tables].sort((a, b) => a.name.localeCompare(b.name))) {
      for (const field of [...table.fields].sort((a, b) => a.name.localeCompare(b.name))) {
        const key = `${field.name}::${field.description ?? ""}`;
        const sourceEmbedding =
          fieldEmbeddingCache.get(key) ?? deterministicEmbedding(`${field.name} ${field.description ?? ""}`);
        fieldEmbeddingCache.set(key, sourceEmbedding);

        let best: Annotation | undefined;
        for (const candidate of attributes) {
          const rule = ruleScore(field, candidate);
          const similarity = cosineSimilarity(
            sourceEmbedding,
            deterministicEmbedding(`${candidate.name} ${candidate.description}`)
          );
          const confidence = blendConfidence(rule.score, similarity);
          if (!best || confidence > best.confidence) {
            best = {
              source_system: system.name,
              source_table: table.name,
              field_name: field.name,
              canonical_target: candidate,
              confidence,
              explanation: `${rule.explanation}; embedding=${similarity.toFixed(3)}`,
            };
          }
        }
        if (best) {
          annotations.push(best);
        }
      }
    }
  }

  const compatibility_matrix: CompatibilityRow[] = [];
  for (let i = 0; i < annotations.length; i += 1) {
    for (let j = i + 1; j < annotations.length; j += 1) {
      const left = annotations[i];
      const right = annotations[j];
      if (left.source_system === right.source_system) {
        continue;
      }
      let compatible = true;
      let reason = "Canonical, unit, and type alignment confirmed";
      if (left.canonical_target.name !== right.canonical_target.name) {
        compatible = false;
        reason = `Canonical mismatch: ${left.canonical_target.name} vs ${right.canonical_target.name}`;
      } else if ((left.canonical_target.unit ?? null) !== (right.canonical_target.unit ?? null)) {
        compatible = false;
        reason = `Unit mismatch: ${left.canonical_target.unit ?? "none"} vs ${right.canonical_target.unit ?? "none"}`;
      }
      compatibility_matrix.push({
        left: `${left.source_system}.${left.source_table}.${left.field_name}`,
        right: `${right.source_system}.${right.source_table}.${right.field_name}`,
        compatible,
        reason,
      });
    }
  }

  return { schema_annotations: annotations, compatibility_matrix };
}
