"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadOntology = loadOntology;
exports.mapSystems = mapSystems;
const crypto_1 = require("crypto");
const fs_1 = require("fs");
const path = __importStar(require("path"));
const DEFAULT_DIMENSIONS = 32;
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/_/g, " ")
        .split(/\s+/)
        .filter(Boolean);
}
function deterministicEmbedding(text, dimensions = DEFAULT_DIMENSIONS) {
    const vector = new Array(dimensions).fill(0);
    const tokens = tokenize(text);
    if (tokens.length === 0) {
        return vector;
    }
    for (const token of tokens) {
        const hash = (0, crypto_1.createHash)("sha256").update(token).digest();
        for (let i = 0; i < dimensions; i += 1) {
            vector[i] += hash[i] / 255 - 0.5;
        }
    }
    return vector.map((value) => value / tokens.length);
}
function cosineSimilarity(left, right) {
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
function canonicalAttributes(ontology) {
    const attributes = [];
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
function ruleScore(field, candidate) {
    const tokens = new Set(tokenize(`${field.name} ${field.description ?? ""}`));
    const candidateTokens = new Set(tokenize(candidate.name));
    let score = 0;
    const reasons = [];
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
    const semanticKeywords = {
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
function blendConfidence(ruleScoreValue, similarity) {
    const boundedRule = Math.min(ruleScoreValue, 1);
    return Math.min(1, 0.7 * boundedRule + 0.3 * similarity);
}
function loadOntology(overrides) {
    const base = overrides
        ? overrides
        : path.join(__dirname, "..", "data", "ontology.json");
    return JSON.parse((0, fs_1.readFileSync)(base, "utf8"));
}
function mapSystems(systems, ontologyPath) {
    const ontology = loadOntology(ontologyPath);
    const attributes = canonicalAttributes(ontology);
    const annotations = [];
    const fieldEmbeddingCache = new Map();
    for (const system of [...systems].sort((a, b) => a.name.localeCompare(b.name))) {
        for (const table of [...system.tables].sort((a, b) => a.name.localeCompare(b.name))) {
            for (const field of [...table.fields].sort((a, b) => a.name.localeCompare(b.name))) {
                const key = `${field.name}::${field.description ?? ""}`;
                const sourceEmbedding = fieldEmbeddingCache.get(key) ?? deterministicEmbedding(`${field.name} ${field.description ?? ""}`);
                fieldEmbeddingCache.set(key, sourceEmbedding);
                let best;
                for (const candidate of attributes) {
                    const rule = ruleScore(field, candidate);
                    const similarity = cosineSimilarity(sourceEmbedding, deterministicEmbedding(`${candidate.name} ${candidate.description}`));
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
    const compatibility_matrix = [];
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
            }
            else if ((left.canonical_target.unit ?? null) !== (right.canonical_target.unit ?? null)) {
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
