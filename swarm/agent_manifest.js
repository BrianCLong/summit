"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.emptyManifest = emptyManifest;
exports.generateExampleManifest = generateExampleManifest;
function emptyManifest(runId) { return { runId, cards: [] }; }
function generateExampleManifest(runId) {
    return { runId, cards: [
            { agentId: "a1", role: "Design Agent", tasks: ["Layout sketch"], outputs: ["layout.png"] },
            { agentId: "a2", role: "Review Agent", tasks: ["Validation"], outputs: ["report.md"] }
        ] };
}
