import { v4 as uuid } from 'uuid';
const cases = [];
export const caseResolvers = {
    Query: {
        cases: () => cases,
        case: (_, { id }) => cases.find(c => c.id === id) || null,
        caseTimeline: () => []
    },
    Mutation: {
        createCase: (_, { title }) => {
            const c = {
                id: uuid(),
                title,
                status: 'open',
                priority: 'medium',
                severity: 'medium',
                assignees: [],
                tags: [],
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
                alerts: [],
                evidence: [],
                triageScore: 0
            };
            cases.push(c);
            return c;
        },
        addEvidence: (_, { caseId, name, base64, mime }) => {
            const c = cases.find(cs => cs.id === caseId);
            if (!c)
                throw new Error('case_not_found');
            const ev = {
                id: uuid(),
                name,
                mime,
                sha256: base64, // placeholder
                size: base64.length,
                addedAt: new Date().toISOString()
            };
            c.evidence.push(ev);
            return ev;
        },
        linkAlertsToCase: () => null,
        setCaseStatus: (_, { caseId, status }) => {
            const c = cases.find(cs => cs.id === caseId);
            if (!c)
                throw new Error('case_not_found');
            c.status = status;
            c.updatedAt = new Date().toISOString();
            return c;
        },
        mergeCases: () => null,
        splitCase: () => null
    }
};
//# sourceMappingURL=cases.js.map