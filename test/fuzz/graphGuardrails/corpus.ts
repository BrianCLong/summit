import { GuardrailReasonCode } from '../../../server/src/middleware/cypher-sandbox';

export type GuardrailScenario = {
  id: string;
  query: string;
  clearance: number;
  authorities: string[];
  expected: { allowed: boolean; reason: GuardrailReasonCode };
};

export type GuardrailCorpusInput = GuardrailScenario & { mutatedQuery: string };

type RNG = () => number;

export function createSeededRng(seed: number): RNG {
  return function rng() {
    let t = seed += 0x6d2b79f5;
    t = Math.imul(t ^ t >>> 15, t | 1);
    t ^= t + Math.imul(t ^ t >>> 7, t | 61);
    return ((t ^ t >>> 14) >>> 0) / 4294967296;
  };
}

export function mutateQuery(query: string, rng: RNG): string {
  const operations: Array<(value: string) => string> = [
    (value) => value.replace(/\s+/g, ' '),
    (value) => value.replace(/MATCH/gi, 'match'),
    (value) => `${value} /* fuzz */`,
    (value) => value.replace(/RETURN/gi, 'RETURN '),
  ];

  const op = operations[Math.floor(rng() * operations.length)];
  return op(query);
}

export const baseScenarios: GuardrailScenario[] = [
  {
    id: 'missing-tenant-filter',
    query: 'MATCH (n:GraphNode) RETURN n LIMIT 25',
    clearance: 2,
    authorities: [],
    expected: { allowed: false, reason: 'TENANT_FILTER_MISSING' },
  },
  {
    id: 'write-attempt',
    query: 'MATCH (n:GraphNode { tenantId: $tenantId }) SET n.flag = true RETURN n',
    clearance: 2,
    authorities: [],
    expected: { allowed: false, reason: 'WRITE_OPERATION' },
  },
  {
    id: 'cartesian',
    query: 'MATCH (a:GraphNode { tenantId: $tenantId }), (b:GraphNode { tenantId: $tenantId }) RETURN a,b',
    clearance: 3,
    authorities: ['ADMIN_AUTH'],
    expected: { allowed: false, reason: 'CARTESIAN_PRODUCT' },
  },
  {
    id: 'deep-traversal',
    query: 'MATCH p = (n:GraphNode { tenantId: $tenantId })-[*1..25]->(m) RETURN p',
    clearance: 3,
    authorities: ['ADMIN_AUTH'],
    expected: { allowed: false, reason: 'DEEP_TRAVERSAL' },
  },
  {
    id: 'safe-read',
    query: 'MATCH (n:GraphNode { tenantId: $tenantId }) WHERE n.kind = $kind RETURN n LIMIT 10',
    clearance: 3,
    authorities: [],
    expected: { allowed: true, reason: 'SAFE_READ' },
  },
];

export function buildCorpus(seed: number, iterations: number): GuardrailCorpusInput[] {
  const rng = createSeededRng(seed);
  const corpus: GuardrailCorpusInput[] = [];

  for (let i = 0; i < iterations; i += 1) {
    const scenario = baseScenarios[i % baseScenarios.length];
    const mutatedQuery = mutateQuery(scenario.query, rng);
    corpus.push({ ...scenario, mutatedQuery });
  }

  return corpus;
}
