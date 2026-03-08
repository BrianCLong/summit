"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.diffById = diffById;
function diffById(before, after) {
    const beforeMap = new Map(before.map((e) => [e.id, e]));
    const afterMap = new Map(after.map((e) => [e.id, e]));
    const added = [];
    const removed = [];
    const changed = [];
    afterMap.forEach((value, id) => {
        if (!beforeMap.has(id)) {
            added.push(value);
        }
        else if (JSON.stringify(beforeMap.get(id)) !== JSON.stringify(value)) {
            changed.push({ before: beforeMap.get(id), after: value });
        }
    });
    beforeMap.forEach((value, id) => {
        if (!afterMap.has(id)) {
            removed.push(value);
        }
    });
    return { added, removed, changed };
}
