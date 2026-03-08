"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.chooseRetrievalMode = chooseRetrievalMode;
function chooseRetrievalMode(query) {
    // Simple heuristic; improve later.
    if (query.match(/[A-Za-z_][A-Za-z0-9_]*\(/)) {
        return "regex";
    }
    return "hybrid";
}
