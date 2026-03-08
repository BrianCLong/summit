"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.baseScenarios = void 0;
exports.createSeededRng = createSeededRng;
exports.mutateQuery = mutateQuery;
exports.buildCorpus = buildCorpus;
function createSeededRng(seed) {
    return function rng() {
        let t = seed += 0x6d2b79f5;
        t = Math.imul(t ^ t >>> 15, t | 1);
        t ^= t + Math.imul(t ^ t >>> 7, t | 61);
        return ((t ^ t >>> 14) >>> 0) / 4294967296;
    };
}
function mutateQuery(query, rng) {
    const operations = [
        (value) => value.replace(/\s+/g, ' '),
        (value) => value.replace(/MATCH/gi, 'match'),
        (value) => `${value} /* fuzz */`,
        (value) => value.replace(/RETURN/gi, 'RETURN '),
        (value) => value.replace(/tenantId/gi, 'tenantid'),
    ];
    const op = operations[Math.floor(rng() * operations.length)];
    return op(query);
}
exports.baseScenarios = [
    {
        id: 'missing-tenant-filter',
        query: 'MATCH (n:GraphNode) RETURN n LIMIT 25',
        clearance: 2,
        authorities: [],
        expected: { allowed: false, reason: 'TENANT_FILTER_MISSING' },
        mutate: (value, rng) => mutateQuery(value, rng),
    },
    {
        id: 'write-attempt',
        query: 'MATCH (n:GraphNode { tenantId: $tenantId }) SET n.flag = true RETURN n',
        clearance: 2,
        authorities: [],
        expected: { allowed: false, reason: 'WRITE_OPERATION' },
        mutate: (value, rng) => `${mutateQuery(value, rng)} /* write */`,
    },
    {
        id: 'cartesian',
        query: 'MATCH (a:GraphNode { tenantId: $tenantId }), (b:GraphNode { tenantId: $tenantId }) RETURN a,b',
        clearance: 3,
        authorities: ['ADMIN_AUTH'],
        expected: { allowed: false, reason: 'CARTESIAN_PRODUCT' },
        mutate: (value, rng) => mutateQuery(value.replace('RETURN a,b', 'RETURN a, b'), rng),
    },
    {
        id: 'deep-traversal',
        query: 'MATCH p = (n:GraphNode { tenantId: $tenantId })-[*1..25]->(m) RETURN p',
        clearance: 3,
        authorities: ['ADMIN_AUTH'],
        expected: { allowed: false, reason: 'DEEP_TRAVERSAL' },
        mutate: (value, rng) => mutateQuery(value.replace('1..25', '1..30'), rng),
    },
    {
        id: 'safe-read',
        query: 'MATCH (n:GraphNode { tenantId: $tenantId }) WHERE n.kind = $kind RETURN n LIMIT 10',
        clearance: 3,
        authorities: [],
        expected: { allowed: true, reason: 'SAFE_READ' },
        mutate: (value, rng) => mutateQuery(value, rng),
    },
];
function buildCorpus(seed, iterations) {
    const rng = createSeededRng(seed);
    const corpus = [];
    for (let i = 0; i < iterations; i += 1) {
        const scenario = exports.baseScenarios[i % exports.baseScenarios.length];
        const mutation = scenario.mutate ?? mutateQuery;
        const mutatedQuery = mutation(scenario.query, rng);
        corpus.push({ ...scenario, mutatedQuery });
    }
    return corpus;
}
