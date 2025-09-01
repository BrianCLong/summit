export function normalizeStix(input) {
    return {
        type: 'Observation',
        source: 'taxii',
        confidence: 0,
        seenAt: new Date().toISOString(),
        entities: input.objects || [],
        edges: [],
        provenance: {
            feed: 'stix',
            itemId: input.id || 'unknown',
            fetchedAt: new Date().toISOString(),
        },
    };
}
//# sourceMappingURL=stix.js.map