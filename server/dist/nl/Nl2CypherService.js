export class Nl2CypherService {
    redact(input) {
        return input.replace(/[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}/g, '[redacted]');
    }
    async plan(nl) {
        const redacted = this.redact(nl);
        return {
            cypher: 'MATCH (n) RETURN n LIMIT $limit',
            params: { limit: 25 },
            readOnly: true,
            cost: { expands: 1, estRows: 25 },
            explain: { prompt: redacted }
        };
    }
}
export default Nl2CypherService;
//# sourceMappingURL=Nl2CypherService.js.map