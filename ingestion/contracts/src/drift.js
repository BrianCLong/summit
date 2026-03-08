"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffContracts = diffContracts;
function indexFields(fields) {
    return new Map(fields.map((field) => [field.name, field]));
}
function diffContracts(current, proposed) {
    const diffs = [];
    const currentIndex = indexFields(current.fields);
    const proposedIndex = indexFields(proposed.fields);
    for (const [name, field] of proposedIndex.entries()) {
        if (!currentIndex.has(name)) {
            diffs.push({ field: name, change: 'added', details: `${name} added` });
            continue;
        }
        const existing = currentIndex.get(name);
        if (!existing) {
            // Handle case where existing is undefined
            continue; // or however the logic should handle it
        }
        if (existing.type !== field.type ||
            existing.nullable !== field.nullable ||
            existing.unit !== field.unit ||
            existing.classification !== field.classification) {
            diffs.push({
                field: name,
                change: 'changed',
                details: `type ${existing.type}->${field.type}, nullable ${existing.nullable}->${field.nullable}`
            });
        }
    }
    for (const name of currentIndex.keys()) {
        if (!proposedIndex.has(name)) {
            diffs.push({ field: name, change: 'removed', details: `${name} removed` });
        }
    }
    return diffs;
}
