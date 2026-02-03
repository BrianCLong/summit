import { HeuristicDifficultyEstimator } from "./core/difficulty";
import { defaultCatalog } from "./core/routing/defaultCatalog";
import { CostAwareRouter } from "./core/routing/CostAwareRouter";
import { DebateValidator } from "./collaboration/debate";

const difficultyEstimator = new HeuristicDifficultyEstimator();
const router = new CostAwareRouter(defaultCatalog(), {
  easyMax: 0.30,
  mediumMax: 0.70,
  domainOverrides: {
    legal: { preferModelIds: ["strong"] },
    security: { preferModelIds: ["balanced"] },
  }
});

export async function handleQuery(query: string, llmClient: any) {
  const d = await difficultyEstimator.estimate(query);
  const decision = router.selectModel({ difficulty: d.score, domain: d.domain });

  // Example: only debate for higher difficulty
  if (d.score >= 0.55) {
    const debate = new DebateValidator(llmClient);
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
