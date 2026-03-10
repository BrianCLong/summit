/**
 * Innovation Graph Edge Types
 */

export type InnovationEdgeType =
  | "builds-on" | "replaces" | "competes-with" | "complements" | "depends-on" | "enables"
  | "implements" | "requires" | "provides"
  | "shifts-to" | "challenges" | "embodies"
  | "develops" | "acquires" | "invests-in" | "partners-with" | "publishes" | "employs"
  | "adopts" | "uses" | "applies-to"
  | "targets" | "serves" | "creates"
  | "funds" | "launches" | "signals"
  | "cites" | "influences" | "standardizes";

export type EdgeStrength = "weak" | "moderate" | "strong" | "very-strong";
export type EdgeDirectionality = "directed" | "undirected" | "bidirectional";

export interface BaseEdgeAttrs {
  tags?: string[];
  firstObservedAt?: string;
  lastObservedAt?: string;
  metadata?: Record<string, unknown>;
}

export interface TechnologyRelationAttrs extends BaseEdgeAttrs {
  strength?: number;
  impact?: "low" | "medium" | "high" | "critical";
}

export interface AdoptionRelationAttrs extends BaseEdgeAttrs {
  adoptedAt?: string;
  phase?: "experimental" | "pilot" | "production" | "scaled" | "deprecated";
  scope?: "team" | "division" | "organization-wide" | "ecosystem-wide";
  metrics?: Record<string, number>;
}

export interface FundingRelationAttrs extends BaseEdgeAttrs {
  amount?: number;
  currency?: string;
  date: string;
  roundType?: string;
}

export interface CitationRelationAttrs extends BaseEdgeAttrs {
  citationCount?: number;
  context?: "background" | "method" | "comparison" | "result" | "critique";
}

export interface InfluenceRelationAttrs extends BaseEdgeAttrs {
  strength: number;
  influenceType?: "inspiration" | "methodology" | "implementation" | "critique" | "extension";
}

export const EDGE_DIRECTIONALITY_MAP: Record<InnovationEdgeType, EdgeDirectionality> = {
  "builds-on": "directed", "replaces": "directed", "depends-on": "directed", "enables": "directed",
  "implements": "directed", "requires": "directed", "provides": "directed",
  "shifts-to": "directed", "challenges": "directed", "embodies": "directed",
  "develops": "directed", "acquires": "directed", "invests-in": "directed", "publishes": "directed", "employs": "directed",
  "adopts": "directed", "uses": "directed", "applies-to": "directed",
  "targets": "directed", "serves": "directed", "creates": "directed",
  "funds": "directed", "launches": "directed", "signals": "directed",
  "cites": "directed", "influences": "directed", "standardizes": "directed",
  "competes-with": "undirected", "complements": "undirected", "partners-with": "undirected",
};

export function isValidEdgeType(type: string): type is InnovationEdgeType {
  return Object.prototype.hasOwnProperty.call(EDGE_DIRECTIONALITY_MAP, type);
}

export function getEdgeDirectionality(type: InnovationEdgeType): EdgeDirectionality {
  return EDGE_DIRECTIONALITY_MAP[type];
}

export function interpretEdgeStrength(weight: number): EdgeStrength {
  if (weight < 0.3) return "weak";
  if (weight < 0.6) return "moderate";
  if (weight < 0.8) return "strong";
  return "very-strong";
}
