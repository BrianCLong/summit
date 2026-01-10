// @ts-nocheck
import MiniSearch, { SearchResult } from 'minisearch';
import { createHash } from 'crypto';
import { computePolicyScopeId } from './psid';
import {
  AuthorizedDocument,
  AuthorizedEdge,
  AuthorizedObjects,
  AuthorizedNode,
  BudgetConfig,
  MicroIndex,
  MicroIndexDelta,
  MicroIndexMetadataEntry,
  MicroIndexSeal,
  PolicyScope,
  QueryResponse,
  RetrievalResult,
} from './types';

const cosineSimilarity = (a: number[], b: number[]): number => {
  const length = Math.min(a.length, b.length);
  if (length === 0) {
    return 0;
  }

  let dot = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < length; i += 1) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }

  if (normA === 0 || normB === 0) {
    return 0;
  }

  return dot / (Math.sqrt(normA) * Math.sqrt(normB));
};

const buildAdjacency = (edges: AuthorizedEdge[]): Map<string, Set<string>> => {
  const adjacency = new Map<string, Set<string>>();
  edges.forEach((edge) => {
    if (!adjacency.has(edge.from)) {
      adjacency.set(edge.from, new Set());
    }
    if (!adjacency.has(edge.to)) {
      adjacency.set(edge.to, new Set());
    }
    adjacency.get(edge.from)?.add(edge.to);
    adjacency.get(edge.to)?.add(edge.from);
  });
  return adjacency;
};

const buildLexicalIndex = (documents: AuthorizedDocument[]): MiniSearch<AuthorizedDocument> => {
  const index = new MiniSearch<AuthorizedDocument>({
    fields: ['text'],
    storeFields: ['id', 'metadata'],
    idField: 'id',
  });
  index.addAll(documents);
  return index;
};

const scoreLexicalResults = (
  searchResults: MiniSearch.SearchResult<AuthorizedDocument>[],
  limit: number,
): RetrievalResult[] => {
  return searchResults
    .slice(0, limit)
    .map((result) => ({ id: result.id as string, score: result.score ?? 0, metadata: result.metadata }));
};

const hashObjectSet = (documents: AuthorizedDocument[], nodes: AuthorizedNode[], edges: AuthorizedEdge[]): string => {
  const ids = [
    ...documents.map((doc) => doc.id),
    ...nodes.map((node) => node.id),
    ...edges.map((edge) => `${edge.from}-${edge.to}-${edge.type ?? 'edge'}`),
  ].sort();

  return createHash('sha256').update(ids.join('|')).digest('hex');
};

export const buildMicroIndex = (scope: PolicyScope, authorized: AuthorizedObjects): MicroIndex => {
  const psid = computePolicyScopeId(scope);
  const adjacency = buildAdjacency(authorized.edges);
  const metadata = new Map<string, MicroIndexMetadataEntry>();
  authorized.documents.forEach((doc) => {
    metadata.set(doc.id, { id: doc.id, metadata: doc.metadata });
  });
  authorized.nodes.forEach((node) => {
    metadata.set(node.id, { id: node.id, metadata: node.metadata });
  });

  const seal: MicroIndexSeal = {
    psid,
    policyVersion: scope.policyVersion,
    schemaVersion: scope.schemaVersion,
    objectSetHash: hashObjectSet(authorized.documents, authorized.nodes, authorized.edges),
    redactionProfile: authorized.redactionProfile,
  };

  return {
    seal,
    vectorItems: authorized.documents,
    lexicalItems: authorized.documents,
    nodes: authorized.nodes,
    edges: authorized.edges,
    adjacency,
    metadata,
    deltaLog: [],
  };
};

const searchVectors = (
  documents: AuthorizedDocument[],
  queryEmbedding: number[],
  limit: number,
): RetrievalResult[] => {
  const scored = documents
    .map((doc) => ({
      id: doc.id,
      score: cosineSimilarity(doc.embedding, queryEmbedding),
      metadata: doc.metadata,
    }))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);

  return scored;
};

const mergeResults = (vectorResults: RetrievalResult[], lexicalResults: RetrievalResult[]): RetrievalResult[] => {
  const combined = new Map<string, RetrievalResult>();

  vectorResults.forEach((result) => {
    combined.set(result.id, result);
  });

  lexicalResults.forEach((result) => {
    const existing = combined.get(result.id);
    if (!existing || result.score > existing.score) {
      combined.set(result.id, result);
    }
  });

  return Array.from(combined.values()).sort((a, b) => b.score - a.score);
};

const expandAdjacency = (
  adjacency: Map<string, Set<string>>,
  seeds: RetrievalResult[],
  budget: Pick<BudgetConfig, 'maxHops' | 'maxExpansions'>,
): Set<string> => {
  const visited = new Set<string>();
  const queue: Array<{ id: string; depth: number }> = seeds.map((seed) => ({ id: seed.id, depth: 0 }));

  while (queue.length > 0 && visited.size < budget.maxExpansions) {
    const current = queue.shift();
    if (!current) {
      break;
    }
    if (visited.has(current.id) || current.depth > budget.maxHops) {
      continue;
    }

    visited.add(current.id);
    const neighbors = adjacency.get(current.id);
    if (!neighbors) {
      continue;
    }

    neighbors.forEach((neighbor) => {
      if (!visited.has(neighbor)) {
        queue.push({ id: neighbor, depth: current.depth + 1 });
      }
    });
  }

  return visited;
};

export const queryMicroIndex = (
  microIndex: MicroIndex,
  query: string,
  queryEmbedding: number[],
  budgets: BudgetConfig,
  seed: number,
  topK: number,
): QueryResponse => {
  const lexicalEngine = buildLexicalIndex(microIndex.lexicalItems);
  const lexicalResults = scoreLexicalResults(lexicalEngine.search(query, { prefix: true }), budgets.lexK);
  const vectorResults = searchVectors(microIndex.vectorItems, queryEmbedding, budgets.vectorK);
  const merged = mergeResults(vectorResults, lexicalResults);

  const expandedIds = expandAdjacency(microIndex.adjacency, merged, {
    maxHops: budgets.maxHops,
    maxExpansions: budgets.maxExpansions,
  });

  const scored = merged
    .filter((result) => expandedIds.has(result.id) || budgets.maxHops === 0)
    .slice(0, topK);

  return {
    evidence: scored,
    audit: {
      psid: microIndex.seal.psid,
      seal: microIndex.seal,
      seed,
    },
  };
};

export const applyDelta = (microIndex: MicroIndex, delta: MicroIndexDelta): MicroIndex => {
  const nextIndex: MicroIndex = {
    ...microIndex,
    vectorItems: [...microIndex.vectorItems],
    lexicalItems: [...microIndex.lexicalItems],
    nodes: [...microIndex.nodes],
    edges: [...microIndex.edges],
    adjacency: new Map(microIndex.adjacency),
    metadata: new Map(microIndex.metadata),
    deltaLog: [...microIndex.deltaLog, delta],
  };

  if (delta.operation === 'delete') {
    const idToRemove = delta.document?.id ?? delta.node?.id;
    if (idToRemove) {
      nextIndex.vectorItems = nextIndex.vectorItems.filter((doc) => doc.id !== idToRemove);
      nextIndex.lexicalItems = nextIndex.lexicalItems.filter((doc) => doc.id !== idToRemove);
      nextIndex.adjacency.delete(idToRemove);
      nextIndex.metadata.delete(idToRemove);
    }
  }

  if (delta.document && delta.operation !== 'delete') {
    nextIndex.vectorItems = nextIndex.vectorItems.filter((doc) => doc.id !== delta.document?.id);
    nextIndex.lexicalItems = nextIndex.lexicalItems.filter((doc) => doc.id !== delta.document?.id);
    nextIndex.vectorItems.push(delta.document);
    nextIndex.lexicalItems.push(delta.document);
    nextIndex.metadata.set(delta.document.id, { id: delta.document.id, metadata: delta.document.metadata });
  }

  if (delta.node && delta.operation !== 'delete') {
    nextIndex.nodes = nextIndex.nodes.filter((node) => node.id !== delta.node?.id);
    nextIndex.nodes.push(delta.node);
    nextIndex.metadata.set(delta.node.id, { id: delta.node.id, metadata: delta.node.metadata });
  }

  if (delta.node && delta.operation === 'delete') {
    nextIndex.nodes = nextIndex.nodes.filter((node) => node.id !== delta.node?.id);
  }

  if (delta.edge) {
    const adjacency = new Map(nextIndex.adjacency);
    const existingFrom = adjacency.get(delta.edge.from) ?? new Set<string>();
    existingFrom.add(delta.edge.to);
    adjacency.set(delta.edge.from, existingFrom);

    const existingTo = adjacency.get(delta.edge.to) ?? new Set<string>();
    existingTo.add(delta.edge.from);
    adjacency.set(delta.edge.to, existingTo);

    nextIndex.adjacency = adjacency;
    const edgeKey = `${delta.edge.from}-${delta.edge.to}-${delta.edge.type ?? 'edge'}`;
    const hasEdge = nextIndex.edges.some(
      (edge) => `${edge.from}-${edge.to}-${edge.type ?? 'edge'}` === edgeKey,
    );
    if (!hasEdge) {
      nextIndex.edges.push(delta.edge);
    }
  }

  nextIndex.seal = {
    ...nextIndex.seal,
    objectSetHash: hashObjectSet(nextIndex.vectorItems, nextIndex.nodes, nextIndex.edges),
  };

  return nextIndex;
};
