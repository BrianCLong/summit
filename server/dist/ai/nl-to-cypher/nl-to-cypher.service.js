export class NlToCypherService {
    constructor(adapter) {
        this.adapter = adapter;
    }
    async translate(prompt) {
        if (/show all nodes/i.test(prompt)) {
            return 'MATCH (n) RETURN n LIMIT 25';
        }
        if (/count nodes/i.test(prompt)) {
            return 'MATCH (n) RETURN count(n) AS count';
        }
        return this.adapter.generate(prompt);
    }
}
//# sourceMappingURL=nl-to-cypher.service.js.map