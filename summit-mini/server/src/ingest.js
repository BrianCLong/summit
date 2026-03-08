"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractGraph = extractGraph;
const node_crypto_1 = __importDefault(require("node:crypto"));
const nanoid_1 = require("nanoid");
function sha256(s) {
    return node_crypto_1.default.createHash("sha256").update(s, "utf8").digest("hex");
}
// Tiny “entity” heuristic: capitalized words + distinct tokens
function extractGraph(content) {
    const docId = `doc_${(0, nanoid_1.nanoid)(10)}`;
    const inputSha256 = sha256(content);
    const tokens = content
        .replace(/[^\p{L}\p{N}\s']/gu, " ")
        .split(/\s+/)
        .filter(Boolean);
    const counts = new Map();
    for (const t of tokens) {
        if (t.length < 3) {
            continue;
        }
        const key = t.trim();
        counts.set(key, (counts.get(key) ?? 0) + 1);
    }
    const candidates = [...counts.entries()]
        .sort((a, b) => b[1] - a[1])
        .slice(0, 30)
        .map(([label, c]) => ({
        id: `n_${(0, nanoid_1.nanoid)(10)}`,
        label,
        kind: /^[A-Z]/.test(label) ? "proper" : "token",
        score: c
    }));
    // Co-occurrence edges across top 12 candidates (very small demo)
    const top = candidates.slice(0, 12);
    const edges = [];
    for (let i = 0; i < top.length; i++) {
        for (let j = i + 1; j < top.length; j++) {
            const w = 1; // keep simple
            const srcItem = top[i];
            const dstItem = top[j];
            if (!srcItem || !dstItem) {
                continue;
            } // Ensure items are not null/undefined
            edges.push({ id: `e_${(0, nanoid_1.nanoid)(10)}`, src: srcItem.id, dst: dstItem.id, kind: "cooccurs", weight: w });
        }
    }
    return { docId, inputSha256, nodes: candidates, edges };
}
