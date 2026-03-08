"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.identifyAdvocacyCandidates = identifyAdvocacyCandidates;
function identifyAdvocacyCandidates(health) {
    if (health.score < 75) {
        return [];
    }
    const proofs = health.components
        .filter((component) => component.score > 70)
        .map((component) => `${component.component}:${component.score}`);
    const protections = [
        {
            id: `${health.tenantId}-advocate-fast-lane`,
            category: 'advocacy',
            description: 'Provide fast support lane and roadmap visibility to protect advocates'
        },
        {
            id: `${health.tenantId}-advocate-trust`,
            category: 'advocacy',
            description: 'Share quarterly trust and reliability updates'
        }
    ];
    return [
        {
            tenantId: health.tenantId,
            rationale: [
                'High health score and positive outcomes',
                ...proofs
            ],
            asks: [
                'Case study with proof metrics',
                'Reference call for target ICP',
                'Community session participation'
            ],
            protections
        }
    ];
}
