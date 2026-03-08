"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handleQuery = handleQuery;
const difficulty_1 = require("./core/difficulty");
const defaultCatalog_1 = require("./core/routing/defaultCatalog");
const CostAwareRouter_1 = require("./core/routing/CostAwareRouter");
const debate_1 = require("./collaboration/debate");
const difficultyEstimator = new difficulty_1.HeuristicDifficultyEstimator();
const router = new CostAwareRouter_1.CostAwareRouter((0, defaultCatalog_1.defaultCatalog)(), {
    easyMax: 0.30,
    mediumMax: 0.70,
    domainOverrides: {
        legal: { preferModelIds: ["strong"] },
        security: { preferModelIds: ["balanced"] },
    }
});
async function handleQuery(query, llmClient) {
    const d = await difficultyEstimator.estimate(query);
    const decision = router.selectModel({ difficulty: d.score, domain: d.domain });
    // Example: only debate for higher difficulty
    if (d.score >= 0.55) {
        const debate = new debate_1.DebateValidator(llmClient);
        return debate.run({
            query,
            modelDraft: { id: decision.model.id, maxTokens: decision.model.maxTokens },
            modelCritic: { id: "balanced", maxTokens: 2000 },
            modelRefiner: { id: decision.model.id, maxTokens: decision.model.maxTokens },
            judge: { id: "fast-mini", maxTokens: 800 },
        });
    }
    // otherwise single-shot
    const r = await llmClient.complete({
        modelId: decision.model.id,
        maxTokens: decision.model.maxTokens,
        messages: [{ role: "user", content: query }]
    });
    return { answer: r.text, route: decision, difficulty: d };
}
