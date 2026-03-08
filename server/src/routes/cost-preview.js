"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const graphql_1 = require("graphql");
const router = express_1.default.Router();
function estimate(doc) {
    let maxDepth = 0;
    let fieldCount = 0;
    try {
        const ast = (0, graphql_1.parse)(doc);
        const stack = [];
        graphql_1.visit(ast, {
            enter: {
                Field() {
                    fieldCount += 1;
                    const d = (stack[stack.length - 1] || 0) + 1;
                    stack.push(d);
                    if (d > maxDepth)
                        maxDepth = d;
                },
            },
            leave: {
                Field() {
                    stack.pop();
                },
            },
        });
    }
    catch {
        // fallback for invalid GraphQL
        fieldCount = Math.max(1, Math.floor(doc.length / 20));
        maxDepth = 1;
    }
    // Heuristic estimations (tune as needed)
    const estExecutionMs = Math.min(120000, 20 + fieldCount * 3 + maxDepth * 10);
    const estCostUSD = Number((fieldCount * 0.00001 + maxDepth * 0.00002).toFixed(6));
    const budget = {
        timeMs: Math.ceil(estExecutionMs * 1.5),
        costUSD: Number((estCostUSD * 2).toFixed(6)),
        notes: [
            maxDepth > 10
                ? 'High depth; consider flattening or pagination.'
                : 'Depth OK.',
            fieldCount > 500
                ? 'Large field count; consider requesting fewer fields.'
                : 'Field count OK.',
        ],
    };
    return {
        depth: maxDepth,
        fieldCount,
        estExecutionMs,
        estCostUSD,
        budgetSuggestion: budget,
    };
}
router.post('/graphql/cost-preview', (req, res) => {
    const { operation } = req.body || {};
    if (!operation || typeof operation !== 'string') {
        return res
            .status(400)
            .json({ error: 'operation (GraphQL string) is required' });
    }
    const result = estimate(operation);
    return res.json({ success: true, preview: result, timestamp: Date.now() });
});
exports.default = router;
