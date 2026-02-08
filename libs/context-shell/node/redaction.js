export function applyRedactions(value, rules) {
    let output = value;
    const applied = [];
    for (const rule of rules) {
        if (rule.pattern.test(output)) {
            output = output.replace(rule.pattern, rule.replacement ?? '[REDACTED]');
            applied.push(rule.name);
        }
        rule.pattern.lastIndex = 0;
    }
    return { value: output, applied };
}
//# sourceMappingURL=redaction.js.map