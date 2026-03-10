export function normalizeTrigger(input) {
    // repo_event | schedule | webhook
    return parseAndValidate(input);
}
function parseAndValidate(input) {
    if (!input || !input.id)
        throw new Error("Invalid trigger format");
    return { id: input.id, type: input.type || 'webhook', payload: input.payload || {} };
}
