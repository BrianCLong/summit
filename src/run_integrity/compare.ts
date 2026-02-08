import { EvidenceItem, IntegrityReport, MismatchDetail } from './types';
import { computeItemDigest, computeAggregateDigest } from './digest';
import { openLineageRunSubject } from '../runid/subject';

export class IntegrityComparer {

    constructor(private namespace: string) {}

    async compare(runId: string, pgItems: EvidenceItem[], neoItems: EvidenceItem[]): Promise<IntegrityReport> {
        const mismatches: MismatchDetail[] = [];

        // Index by ID
        const pgMap = new Map(pgItems.map(i => [i.id, i]));
        const neoMap = new Map(neoItems.map(i => [i.id, i]));

        const allIds = new Set([...pgMap.keys(), ...neoMap.keys()]);

        const pgDigests: string[] = [];
        const neoDigests: string[] = [];

        for (const id of allIds) {
            const pgItem = pgMap.get(id);
            const neoItem = neoMap.get(id);

            let pgDigest: string | undefined;
            let neoDigest: string | undefined;

            if (pgItem) {
                pgDigest = computeItemDigest(pgItem.id, pgItem.payload, pgItem.metadata);
                pgDigests.push(pgDigest);
            }

            if (neoItem) {
                // Use pre-computed if trusted, or recompute to be safe.
                // "MWS: Postgres aggregate digest == Neo4j aggregate digest" implies consistency.
                // If Neo4j stores the digest, we might verify it.
                // For this implementation, let's recompute to ensure we are comparing data content,
                // unless payload is missing in Neo4j (graph only).
                // Assuming we have payload in Neo4j for now.
                neoDigest = computeItemDigest(neoItem.id, neoItem.payload, neoItem.metadata);
                neoDigests.push(neoDigest);
            }

            if (!pgItem) {
                mismatches.push({ id, type: 'MISSING_IN_POSTGRES', neoDigest });
            } else if (!neoItem) {
                mismatches.push({ id, type: 'MISSING_IN_NEO4J', postgresDigest: pgDigest });
            } else if (pgDigest !== neoDigest) {
                mismatches.push({ id, type: 'DIGEST_MISMATCH', postgresDigest: pgDigest, neoDigest });
            }
        }

        const pgAgg = computeAggregateDigest(pgDigests);
        const neoAgg = computeAggregateDigest(neoDigests);

        return {
            runId,
            subject: openLineageRunSubject(this.namespace, runId),
            timestamp: new Date().toISOString(),
            status: mismatches.length === 0 ? 'PASS' : 'FAIL',
            postgresCount: pgItems.length,
            neo4jCount: neoItems.length,
            postgresAggregateDigest: pgAgg,
            neo4jAggregateDigest: neoAgg,
            mismatches
        };
    }
}
