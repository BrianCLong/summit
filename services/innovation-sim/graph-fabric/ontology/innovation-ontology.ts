/**
 * Innovation Simulation Ontology
 */

import type { InnovationNode, InnovationEdge, InnovationGraph } from "../../interfaces/innovation-graph.js";
import type { EvidenceRef } from "../../interfaces/evidence.js";
import { type InnovationNodeType, isValidNodeType } from "./node-types.js";
import { type InnovationEdgeType, isValidEdgeType, getEdgeDirectionality } from "./edge-types.js";

export type { InnovationNodeType, InnovationEdgeType };
export { isValidNodeType, isValidEdgeType, getEdgeDirectionality };

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function hasEvidence(node: InnovationNode): boolean {
  return node.evidenceRefs.length > 0;
}

export function edgeHasEvidence(edge: InnovationEdge): boolean {
  return edge.evidenceRefs.length > 0;
}

export function hasValidEvidenceConfidence(refs: EvidenceRef[]): boolean {
  return refs.every(ref => ref.confidence >= 0.0 && ref.confidence <= 1.0);
}

export function isValidNode(node: InnovationNode): boolean {
  if (!node.id || node.id.length === 0) return false;
  if (!node.name || node.name.length === 0) return false;
  if (!isValidNodeType(node.type)) return false;
  if (!hasEvidence(node)) return false;
  if (!hasValidEvidenceConfidence(node.evidenceRefs)) return false;
  return true;
}

export function isValidEdge(edge: InnovationEdge): boolean {
  if (!edge.id || edge.id.length === 0) return false;
  if (!isValidEdgeType(edge.type)) return false;
  if (!edge.from || edge.from.length === 0) return false;
  if (!edge.to || edge.to.length === 0) return false;
  if (!edgeHasEvidence(edge)) return false;
  if (!hasValidEvidenceConfidence(edge.evidenceRefs)) return false;
  if (edge.weight !== undefined && (edge.weight < 0 || edge.weight > 1)) return false;
  return true;
}

export function isValidGraph(graph: InnovationGraph): boolean {
  if (!graph.metadata?.id || !graph.metadata?.version || !graph.metadata?.createdAt) return false;
  if (!graph.nodes.every(isValidNode)) return false;
  if (!graph.edges.every(isValidEdge)) return false;
  const nodeIds = new Set(graph.nodes.map(n => n.id));
  for (const edge of graph.edges) {
    if (!nodeIds.has(edge.from) || !nodeIds.has(edge.to)) return false;
  }
  return true;
}

export function validateNode(node: InnovationNode): ValidationResult {
  const errors: string[] = [];
  if (!node.id || node.id.length === 0) errors.push("Node ID is required and cannot be empty");
  if (!node.name || node.name.length === 0) errors.push("Node name is required and cannot be empty");
  if (!isValidNodeType(node.type)) errors.push(`Invalid node type: ${node.type}`);
  if (!hasEvidence(node)) errors.push("Node must have at least one evidence reference");
  if (!hasValidEvidenceConfidence(node.evidenceRefs)) errors.push("All evidence references must have confidence scores between 0.0 and 1.0");
  return { valid: errors.length === 0, errors };
}

export function validateEdge(edge: InnovationEdge): ValidationResult {
  const errors: string[] = [];
  if (!edge.id || edge.id.length === 0) errors.push("Edge ID is required and cannot be empty");
  if (!isValidEdgeType(edge.type)) errors.push(`Invalid edge type: ${edge.type}`);
  if (!edge.from || edge.from.length === 0) errors.push("Edge 'from' field is required and cannot be empty");
  if (!edge.to || edge.to.length === 0) errors.push("Edge 'to' field is required and cannot be empty");
  if (!edgeHasEvidence(edge)) errors.push("Edge must have at least one evidence reference");
  if (!hasValidEvidenceConfidence(edge.evidenceRefs)) errors.push("All evidence references must have confidence scores between 0.0 and 1.0");
  if (edge.weight !== undefined && (edge.weight < 0 || edge.weight > 1)) errors.push(`Edge weight must be between 0.0 and 1.0, got: ${edge.weight}`);
  return { valid: errors.length === 0, errors };
}

export function validateGraph(graph: InnovationGraph): ValidationResult {
  const errors: string[] = [];
  if (!graph.metadata?.id) errors.push("Graph metadata.id is required");
  if (!graph.metadata?.version) errors.push("Graph metadata.version is required");
  if (!graph.metadata?.createdAt) errors.push("Graph metadata.createdAt is required");

  for (const node of graph.nodes) {
    const nodeValidation = validateNode(node);
    if (!nodeValidation.valid) errors.push(`Node ${node.id}: ${nodeValidation.errors.join(", ")}`);
  }

  const nodeIds = new Set(graph.nodes.map(n => n.id));
  for (const edge of graph.edges) {
    const edgeValidation = validateEdge(edge);
    if (!edgeValidation.valid) errors.push(`Edge ${edge.id}: ${edgeValidation.errors.join(", ")}`);
    if (!nodeIds.has(edge.from)) errors.push(`Edge ${edge.id} references non-existent 'from' node: ${edge.from}`);
    if (!nodeIds.has(edge.to)) errors.push(`Edge ${edge.id} references non-existent 'to' node: ${edge.to}`);
  }

  return { valid: errors.length === 0, errors };
}

export function getAllNodeTypes(): InnovationNodeType[] {
  return [
    "technology", "capability", "paradigm", "pattern", "framework", "language",
    "organization", "research-group", "community",
    "product", "project", "paper", "standard",
    "market", "domain", "use-case",
    "funding-event", "launch-event", "adoption-signal"
  ];
}

export function getAllEdgeTypes(): InnovationEdgeType[] {
  return [
    "builds-on", "replaces", "competes-with", "complements", "depends-on", "enables",
    "implements", "requires", "provides",
    "shifts-to", "challenges", "embodies",
    "develops", "acquires", "invests-in", "partners-with", "publishes", "employs",
    "adopts", "uses", "applies-to",
    "targets", "serves", "creates",
    "funds", "launches", "signals",
    "cites", "influences", "standardizes"
  ];
}

export function getNodeCategory(type: InnovationNodeType): string {
  if (["technology", "capability", "paradigm", "pattern", "framework", "language"].includes(type)) return "technology-capability";
  if (["organization", "research-group", "community"].includes(type)) return "organization";
  if (["product", "project", "paper", "standard"].includes(type)) return "artifact";
  if (["market", "domain", "use-case"].includes(type)) return "market-domain";
  if (["funding-event", "launch-event", "adoption-signal"].includes(type)) return "event-signal";
  return "unknown";
}

export function getEdgeCategory(type: InnovationEdgeType): string {
  if (["builds-on", "replaces", "competes-with", "complements", "depends-on", "enables"].includes(type)) return "technology-relation";
  if (["implements", "requires", "provides"].includes(type)) return "capability-relation";
  if (["shifts-to", "challenges", "embodies"].includes(type)) return "paradigm-relation";
  if (["develops", "acquires", "invests-in", "partners-with", "publishes", "employs"].includes(type)) return "organizational-relation";
  if (["adopts", "uses", "applies-to"].includes(type)) return "adoption-usage";
  if (["targets", "serves", "creates"].includes(type)) return "market-relation";
  if (["funds", "launches", "signals"].includes(type)) return "event-relation";
  if (["cites", "influences", "standardizes"].includes(type)) return "knowledge-relation";
  return "unknown";
}
