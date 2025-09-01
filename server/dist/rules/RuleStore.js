export class RuleStore {
    constructor() {
        this.rules = [];
    }
    create(rule) {
        this.rules.push(rule);
        return rule;
    }
    list() {
        return this.rules;
    }
    listEnabled() {
        return this.rules.filter((r) => r.enabled);
    }
}
//# sourceMappingURL=RuleStore.js.map