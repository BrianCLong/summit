export type HallucinationType = 'unsupported_claim' | 'entity_fabrication' | 'factual_inconsistency' | 'none';

export interface Claim {
  id: string;
  text: string;
  entities: string[];
  relationship?: string;
  attribute?: string;
  value?: string;
}

export interface Node {
  id: string;
  type: string;
  name: string;
  lifecycle: string;
  [key: string]: any;
}

export interface Edge {
  id: string;
  type: string;
  from: string;
  to: string;
  [key: string]: any;
}

export interface KnowledgeGraph {
  nodes: Node[];
  edges: Edge[];
}

export interface EvaluatedClaim extends Claim {
  isHallucination: boolean;
  hallucinationType: HallucinationType;
  supporting_nodes: string[];
  contradicting_nodes: string[];
  fabricated_entities: string[];
}

/**
 * Stub for claim extraction. In a real system this would use NLP to extract claims from the answer text.
 * For this test harness, it just returns the pre-extracted claims defined in the fixtures.
 */
export function extractClaims(answerText: string, preExtractedClaims: Claim[]): Claim[] {
  return preExtractedClaims;
}

/**
 * Checks a single claim against the ground-truth knowledge graph.
 */
export function checkClaimGrounding(claim: Claim, graph: KnowledgeGraph): EvaluatedClaim {
  const result: EvaluatedClaim = {
    ...claim,
    isHallucination: false,
    hallucinationType: 'none',
    supporting_nodes: [],
    contradicting_nodes: [],
    fabricated_entities: []
  };

  // 1. Check for entity fabrication
  for (const entityId of claim.entities) {
    const nodeExists = graph.nodes.some(n => n.id === entityId);
    if (!nodeExists) {
      result.isHallucination = true;
      result.hallucinationType = 'entity_fabrication';
      result.fabricated_entities.push(entityId);
    } else {
      result.supporting_nodes.push(entityId);
    }
  }

  if (result.isHallucination && result.hallucinationType === 'entity_fabrication') {
      return result;
  }

  // 2. Check for relationship / attribute support
  if (claim.relationship && claim.entities.length >= 2) {
    // Look for an edge connecting the entities with the given relationship type
    const [fromEntity, toEntity] = claim.entities;
    const edgeExists = graph.edges.some(
      e => e.type === claim.relationship && e.from === fromEntity && e.to === toEntity
    );

    if (!edgeExists) {
      result.isHallucination = true;
      result.hallucinationType = 'unsupported_claim';
      // The nodes exist, but the relationship between them is unsupported
      result.contradicting_nodes = [fromEntity, toEntity];
      result.supporting_nodes = [];
      return result;
    }
  } else if (claim.attribute && claim.value && claim.entities.length === 1) {
    // Look for node attribute matching
    const entityId = claim.entities[0];
    const node = graph.nodes.find(n => n.id === entityId);

    if (node) {
      if (node[claim.attribute] !== claim.value) {
        result.isHallucination = true;
        result.hallucinationType = 'factual_inconsistency';
        result.contradicting_nodes = [entityId];
        result.supporting_nodes = [];
        return result;
      }
    }
  }

  // 3. Claim is fully supported by the graph
  return result;
}

export interface EvaluationResult {
  totalClaims: number;
  hallucinatedClaims: number;
  hallucinationRate: number;
  breakdown: {
    unsupportedClaims: number;
    entityFabrication: number;
    factualInconsistency: number;
  };
  evaluatedClaims: EvaluatedClaim[];
}

/**
 * Calculates hallucination metrics for a set of evaluated claims.
 */
export function calculateMetrics(evaluatedClaims: EvaluatedClaim[]): EvaluationResult {
  const totalClaims = evaluatedClaims.length;
  let unsupportedClaims = 0;
  let entityFabrication = 0;
  let factualInconsistency = 0;

  for (const claim of evaluatedClaims) {
    if (claim.isHallucination) {
      if (claim.hallucinationType === 'unsupported_claim') unsupportedClaims++;
      if (claim.hallucinationType === 'entity_fabrication') entityFabrication++;
      if (claim.hallucinationType === 'factual_inconsistency') factualInconsistency++;
    }
  }

  const hallucinatedClaims = unsupportedClaims + entityFabrication + factualInconsistency;
  const hallucinationRate = totalClaims > 0 ? hallucinatedClaims / totalClaims : 0;

  return {
    totalClaims,
    hallucinatedClaims,
    hallucinationRate,
    breakdown: {
      unsupportedClaims,
      entityFabrication,
      factualInconsistency
    },
    evaluatedClaims
  };
}

/**
 * Main evaluation harness entry point.
 */
export function evaluateAnswer(answerText: string, providedClaims: Claim[], graph: KnowledgeGraph): EvaluationResult {
  // 1. Claim Extraction
  const extractedClaims = extractClaims(answerText, providedClaims);

  // 2. Graph Grounding
  const evaluatedClaims = extractedClaims.map(claim => checkClaimGrounding(claim, graph));

  // 3. Compute Metrics
  return calculateMetrics(evaluatedClaims);
}
