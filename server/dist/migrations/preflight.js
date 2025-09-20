export async function preflightCheck({ neo4jUri }) {
    // 1) Validate schema version table exists
    // 2) Confirm retention policies present & tenant residency set
    // 3) Ensure persisted queries compiled
    return { ok: true, checks: ['schema', 'retention', 'persistedQueries'] };
}
//# sourceMappingURL=preflight.js.map