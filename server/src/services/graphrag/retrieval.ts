/**
 * GraphRAG Retrieval Pipeline
 * Orchestrates graph context and evidence retrieval for a case + question
 */

import logger from '../../utils/logger.js';
import {
  GraphRagRequest,
  RetrievalParams,
  RetrievalResult,
  GraphContext,
  CaseGraphRepository,
  EvidenceRepository,
  LlmContextPayload,
  LlmContextNode,
  LlmContextEdge,
  EvidenceSnippet,
} from './types.js';

// Default retrieval parameters
const DEFAULT_RETRIEVAL_PARAMS: RetrievalParams = {
  maxNodes: 50,
  maxDepth: 3,
  maxEvidenceSnippets: 20,
};

// Key properties to extract from nodes/edges for LLM context
const KEY_PROPERTY_NAMES = [
  'name',
  'label',
  'title',
  'description',
  'status',
  'type',
  'category',
  'severity',
  'confidence',
  'source',
  'timestamp',
  'date',
  'created_at',
  'updated_at',
];

/**
 * Retrieve graph context for a GraphRAG request
 */
export async function retrieveGraphContext(
  req: GraphRagRequest,
  params: Partial<RetrievalParams> = {},
  caseGraphRepo: CaseGraphRepository,
  evidenceRepo: EvidenceRepository,
): Promise<RetrievalResult> {
  const resolvedParams = { ...DEFAULT_RETRIEVAL_PARAMS, ...params };

  logger.debug({
    message: 'Starting graph context retrieval',
    caseId: req.caseId,
    question: req.question.substring(0, 100),
    params: resolvedParams,
  });

  // 1. Fetch case subgraph
  const { nodes, edges } = await caseGraphRepo.getCaseSubgraph(req.caseId, {
    maxNodes: resolvedParams.maxNodes,
    maxDepth: resolvedParams.maxDepth,
  });

  // 2. Search for relevant evidence snippets
  const evidenceSnippets = await evidenceRepo.searchEvidenceSnippets({
    caseId: req.caseId,
    query: req.question,
    maxSnippets: resolvedParams.maxEvidenceSnippets,
  });

  // 3. Boost node relevance based on keyword matches
  const boostedNodes = computeNodeRelevance(nodes, req.question);

  // 4. Sort nodes by relevance and trim to limit
  const sortedNodes = boostedNodes
    .sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0))
    .slice(0, resolvedParams.maxNodes);

  // 5. Filter edges to only include those in sorted nodes
  const nodeIds = new Set(sortedNodes.map((n) => n.id));
  const filteredEdges = edges.filter(
    (e) => nodeIds.has(e.fromId) && nodeIds.has(e.toId),
  );

  const context: GraphContext = {
    nodes: sortedNodes,
    edges: filteredEdges,
    evidenceSnippets,
  };

  logger.info({
    message: 'Graph context retrieved',
    caseId: req.caseId,
    nodeCount: context.nodes.length,
    edgeCount: context.edges.length,
    evidenceCount: context.evidenceSnippets.length,
  });

  return { context };
}

/**
 * Compute relevance scores for nodes based on keyword matches
 */
function computeNodeRelevance(
  nodes: GraphContext['nodes'],
  question: string,
): Array<GraphContext['nodes'][0] & { relevance?: number }> {
  const keywords = extractKeywords(question);

  return nodes.map((node) => {
    let relevance = 0;

    // Check label
    if (node.label) {
      relevance += countMatches(node.label.toLowerCase(), keywords) * 2;
    }

    // Check type
    if (node.type) {
      relevance += countMatches(node.type.toLowerCase(), keywords);
    }

    // Check properties
    if (node.properties) {
      const propStr = JSON.stringify(node.properties).toLowerCase();
      relevance += countMatches(propStr, keywords) * 0.5;
    }

    return { ...node, relevance };
  });
}

/**
 * Extract keywords from a question
 */
function extractKeywords(question: string): string[] {
  // Simple keyword extraction - remove common words
  const stopWords = new Set([
    'the', 'a', 'an', 'is', 'are', 'was', 'were', 'be', 'been',
    'being', 'have', 'has', 'had', 'do', 'does', 'did', 'will',
    'would', 'could', 'should', 'may', 'might', 'must', 'shall',
    'can', 'need', 'dare', 'ought', 'used', 'to', 'of', 'in',
    'for', 'on', 'with', 'at', 'by', 'from', 'as', 'into',
    'through', 'during', 'before', 'after', 'above', 'below',
    'between', 'under', 'again', 'further', 'then', 'once',
    'here', 'there', 'when', 'where', 'why', 'how', 'all',
    'each', 'few', 'more', 'most', 'other', 'some', 'such',
    'no', 'nor', 'not', 'only', 'own', 'same', 'so', 'than',
    'too', 'very', 'just', 'what', 'which', 'who', 'whom', 'this',
    'that', 'these', 'those', 'am', 'and', 'but', 'if', 'or',
    'because', 'until', 'while', 'about', 'against',
  ]);

  return question
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length > 2 && !stopWords.has(word));
}

/**
 * Count keyword matches in text
 */
function countMatches(text: string, keywords: string[]): number {
  return keywords.filter((kw) => text.includes(kw)).length;
}

/**
 * Build LLM-ready context payload from retrieval result
 */
export function buildLlmContextPayload(
  req: GraphRagRequest,
  retrievalResult: RetrievalResult,
): LlmContextPayload {
  const { context } = retrievalResult;

  // Transform nodes to LLM-friendly format with key properties only
  const llmNodes: LlmContextNode[] = context.nodes.map((node) => ({
    id: node.id,
    type: node.type,
    label: node.label,
    keyProperties: extractKeyProperties(node.properties),
  }));

  // Transform edges to LLM-friendly format
  const llmEdges: LlmContextEdge[] = context.edges.map((edge) => ({
    id: edge.id,
    type: edge.type,
    fromId: edge.fromId,
    toId: edge.toId,
    keyProperties: extractKeyProperties(edge.properties),
  }));

  return {
    question: req.question,
    caseId: req.caseId,
    nodes: llmNodes,
    edges: llmEdges,
    evidenceSnippets: context.evidenceSnippets,
  };
}

/**
 * Extract only key properties for LLM context (avoid bloating)
 */
function extractKeyProperties(
  properties?: Record<string, any>,
): Record<string, any> {
  if (!properties) return {};

  const keyProps: Record<string, any> = {};

  for (const propName of KEY_PROPERTY_NAMES) {
    if (properties[propName] !== undefined && properties[propName] !== null) {
      keyProps[propName] = properties[propName];
    }
  }

  return keyProps;
}

/**
 * Get context summary for audit/response
 */
export function getContextSummary(context: GraphContext): {
  numNodes: number;
  numEdges: number;
  numEvidenceSnippets: number;
} {
  return {
    numNodes: context.nodes.length,
    numEdges: context.edges.length,
    numEvidenceSnippets: context.evidenceSnippets.length,
  };
}

/**
 * Get set of valid evidence IDs from context
 */
export function getValidEvidenceIds(
  evidenceSnippets: EvidenceSnippet[],
): Set<string> {
  return new Set(evidenceSnippets.map((e) => e.evidenceId));
}

/**
 * Get set of valid claim IDs from context
 */
export function getValidClaimIds(
  evidenceSnippets: EvidenceSnippet[],
): Set<string> {
  return new Set(
    evidenceSnippets
      .filter((e) => e.claimId)
      .map((e) => e.claimId as string),
  );
}
