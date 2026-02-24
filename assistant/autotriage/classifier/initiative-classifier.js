export function classifyInitiative(item, rules) {
    const text = `${item.title} ${item.description}`.toLowerCase();
    for (const rule of rules) {
        // Check keywords
        if (rule.keywords.some((keyword) => text.includes(keyword))) {
            return rule.id;
        }
        // Check patterns
        if (rule.patterns.some((pattern) => pattern.test(text))) {
            return rule.id;
        }
    }
    return undefined;
}
//# sourceMappingURL=initiative-classifier.js.map