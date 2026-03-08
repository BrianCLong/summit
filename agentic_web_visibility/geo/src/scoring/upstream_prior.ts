// Simulates the expected visibility inherited from traditional search index prominence
export class UpstreamPriorScorer {
    public getPrior(domain: string): number {
        // Mock values for v1
        const knownDomains: Record<string, number> = {
            'hubspot.com': 0.8,
            'salesforce.com': 0.9,
            'unknown.com': 0.1
        };

        for (const known of Object.keys(knownDomains)) {
            if (domain.includes(known) || known.includes(domain)) {
                return knownDomains[known];
            }
        }

        return 0.3; // Default average prior
    }
}
