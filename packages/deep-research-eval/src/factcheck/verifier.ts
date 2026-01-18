import { createHash } from 'crypto';
import type { TaskPolicy } from '../taskpack/schema.js';
import type { ExtractedClaim } from './claim_extractor.js';
import type { ClaimResult, EvidenceSnippet, FactCheckSummary } from './verdict_schema.js';

export interface RetrievalSource {
  sourceId: string;
  url?: string;
  snippet: string;
  contradiction?: boolean;
}

export interface RetrievalResult {
  sources: RetrievalSource[];
  retrievedAt: string;
  queryPlan: string[];
}

export interface EvidenceRetriever {
  retrieve: (query: string, policy?: TaskPolicy) => Promise<RetrievalResult>;
}

export const createMockRetriever = (): EvidenceRetriever => ({
  retrieve: async (query) => ({
    sources: [],
    retrievedAt: new Date().toISOString(),
    queryPlan: [`mock-retrieval:${query.slice(0, 24)}`],
  }),
});

const hashSnippet = (input: string): string => {
  return createHash('sha256').update(input).digest('hex');
};

const toEvidenceSnippet = (source: RetrievalSource, retrievedAt: string): EvidenceSnippet => ({
  sourceId: source.sourceId,
  snippet: source.snippet,
  url: source.url,
  retrievedAt,
  hash: hashSnippet(`${source.sourceId}:${source.snippet}`),
});

export interface VerificationOutput {
  results: ClaimResult[];
  summary: FactCheckSummary;
  policyViolations: string[];
  claimGraph: {
    nodes: { id: string; label: string; type: 'claim' | 'evidence' }[];
    edges: { from: string; to: string; type: 'supports' | 'contradicts' }[];
  };
}

export const verifyClaims = async (
  claims: ExtractedClaim[],
  retriever: EvidenceRetriever,
  policy?: TaskPolicy,
): Promise<VerificationOutput> => {
  const results: ClaimResult[] = [];
  const policyViolations: string[] = [];
  const claimGraph = { nodes: [], edges: [] } as VerificationOutput['claimGraph'];

  for (const claim of claims) {
    const retrieval = await retriever.retrieve(claim.text, policy);
    const evidence = retrieval.sources.filter((source) => !source.contradiction);
    const contradictions = retrieval.sources.filter((source) => source.contradiction);

    const evidenceSnippets = evidence.map((source) => toEvidenceSnippet(source, retrieval.retrievedAt));
    const contradictionSnippets = contradictions.map((source) => toEvidenceSnippet(source, retrieval.retrievedAt));

    const denyList = policy?.denySources ?? [];
    const allowList = policy?.allowSources ?? [];
    const violatingSources = retrieval.sources
      .map((source) => source.sourceId)
      .filter((sourceId) => denyList.includes(sourceId));

    if (allowList.length > 0) {
      const allowViolations = retrieval.sources
        .map((source) => source.sourceId)
        .filter((sourceId) => !allowList.includes(sourceId));
      if (allowViolations.length > 0) {
        policyViolations.push(
          `Claim ${claim.id} used non-allowlisted sources: ${allowViolations.join(', ')}`,
        );
      }
    }

    if (violatingSources.length > 0) {
      policyViolations.push(
        `Claim ${claim.id} used denied sources: ${violatingSources.join(', ')}`,
      );
    }

    let verdict: ClaimResult['verdict'] = 'Unknown';
    let confidence = 0.3;

    if (evidenceSnippets.length > 0 && contradictionSnippets.length === 0) {
      verdict = 'Right';
      confidence = 0.75;
    }

    if (contradictionSnippets.length > 0) {
      verdict = 'Wrong';
      confidence = 0.65;
    }

    results.push({
      claimId: claim.id,
      text: claim.text,
      verdict,
      confidence,
      evidence: evidenceSnippets,
      contradictions: contradictionSnippets,
      notes: retrieval.queryPlan.join(' -> '),
    });

    claimGraph.nodes.push({ id: claim.id, label: claim.text, type: 'claim' });
    evidenceSnippets.forEach((snippet) => {
      const nodeId = `evidence-${snippet.hash.slice(0, 12)}`;
      claimGraph.nodes.push({ id: nodeId, label: snippet.sourceId, type: 'evidence' });
      claimGraph.edges.push({ from: claim.id, to: nodeId, type: 'supports' });
    });
    contradictionSnippets.forEach((snippet) => {
      const nodeId = `contradiction-${snippet.hash.slice(0, 12)}`;
      claimGraph.nodes.push({ id: nodeId, label: snippet.sourceId, type: 'evidence' });
      claimGraph.edges.push({ from: claim.id, to: nodeId, type: 'contradicts' });
    });
  }

  const totalClaims = claims.length;
  const checkedClaims = results.filter((result) => result.verdict !== 'Unknown').length;
  const contradictions = results.filter((result) => result.verdict === 'Wrong').length;
  const coverageRatio = totalClaims === 0 ? 0 : checkedClaims / totalClaims;

  return {
    results,
    summary: {
      totalClaims,
      checkedClaims,
      coverageRatio,
      contradictions,
    },
    policyViolations,
    claimGraph,
  };
};
