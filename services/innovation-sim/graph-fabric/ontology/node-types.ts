/**
 * Innovation Graph Node Types
 *
 * Defines the ontology of entities that can exist in the Innovation Simulation graph.
 */

export type InnovationNodeType =
  | "technology" | "capability" | "paradigm" | "pattern" | "framework" | "language"
  | "organization" | "research-group" | "community"
  | "product" | "project" | "paper" | "standard"
  | "market" | "domain" | "use-case"
  | "funding-event" | "launch-event" | "adoption-signal";

export type NodeMaturity = "nascent" | "emerging" | "accelerating" | "mature" | "declining" | "legacy";
export type NodeStrategicImportance = "critical" | "high" | "medium" | "low" | "experimental";
export type OrganizationType = "startup" | "scale-up" | "enterprise" | "research-lab" | "university" | "consortium" | "government";
export type MarketSegment = "b2b-saas" | "b2c-consumer" | "enterprise" | "government" | "healthcare" | "finance" | "defense-intel" | "research" | "open-source";

export interface BaseNodeAttrs {
  tags?: string[];
  externalIds?: Record<string, string>;
  aliases?: string[];
}

export interface TechnologyAttrs extends BaseNodeAttrs {
  maturity: NodeMaturity;
  domain?: string[];
  capabilities?: string[];
  strategicImportance?: NodeStrategicImportance;
}

export interface CapabilityAttrs extends BaseNodeAttrs {
  domain: string;
  strategicImportance: NodeStrategicImportance;
  complexity?: "low" | "medium" | "high" | "very-high";
  reusability?: number;
}

export interface ParadigmAttrs extends BaseNodeAttrs {
  maturity: NodeMaturity;
  magnitude?: "incremental" | "disruptive" | "transformational" | "revolutionary";
  domain?: string[];
}

export interface OrganizationAttrs extends BaseNodeAttrs {
  organizationType: OrganizationType;
  founded?: string;
  size?: "small" | "medium" | "large" | "xlarge";
  geography?: string[];
  market?: MarketSegment[];
}

export interface ProductAttrs extends BaseNodeAttrs {
  launched?: string;
  market?: MarketSegment[];
  status?: "active" | "beta" | "deprecated" | "discontinued";
}

export interface PaperAttrs extends BaseNodeAttrs {
  publishedAt?: string;
  venue?: string;
  citationCount?: number;
  domain?: string[];
}

export interface FundingEventAttrs extends BaseNodeAttrs {
  amount?: number;
  currency?: string;
  roundType?: "pre-seed" | "seed" | "series-a" | "series-b" | "series-c" | "ipo" | "acquisition";
  date: string;
}

export interface MarketAttrs extends BaseNodeAttrs {
  segment: MarketSegment;
  size?: "small" | "medium" | "large" | "xlarge";
  growth?: "declining" | "stable" | "growing" | "explosive";
}

export function isValidNodeType(type: string): type is InnovationNodeType {
  const validTypes: InnovationNodeType[] = [
    "technology", "capability", "paradigm", "pattern", "framework", "language",
    "organization", "research-group", "community",
    "product", "project", "paper", "standard",
    "market", "domain", "use-case",
    "funding-event", "launch-event", "adoption-signal"
  ];
  return validTypes.includes(type as InnovationNodeType);
}
