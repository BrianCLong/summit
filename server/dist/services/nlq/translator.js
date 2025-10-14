export class NLQTranslator {
    async translate(question, tenantId) {
        const lower = question.toLowerCase();
        let cypher;
        if (lower.includes('person') || lower.includes('people')) {
            cypher = 'MATCH (n:Person) WHERE n.tenantId = $tenantId RETURN n LIMIT 25';
        }
        else {
            cypher = 'MATCH (n) WHERE n.tenantId = $tenantId RETURN n LIMIT 25';
        }
        return {
            cypher,
            params: { tenantId },
            citations: [],
            metrics: { strategy: 'rule' },
        };
    }
}
export const translator = new NLQTranslator();
//# sourceMappingURL=translator.js.map