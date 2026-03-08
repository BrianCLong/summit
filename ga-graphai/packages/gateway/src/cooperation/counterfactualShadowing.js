"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CounterfactualShadowingCoordinator = void 0;
const promptOps_js_1 = require("../promptOps.js");
function extractCoveredCriteria(content, task) {
    const coverage = new Set();
    task.acceptanceCriteria.forEach((criterion) => {
        if (new RegExp(criterion.id, 'i').test(content)) {
            coverage.add(criterion.id);
        }
    });
    return coverage;
}
class CounterfactualShadowingCoordinator {
    guard = new promptOps_js_1.GuardedGenerator();
    async run(task, primary, shadow, adjudicator) {
        const primaryOutput = await primary.generate({
            task,
            strand: 'implementation',
            prompt: `Produce the best implementation plan for ${task.title}. Reference acceptance criteria IDs.`,
        });
        const shadowOutput = await shadow.generate({
            task,
            strand: 'counterfactual',
            prompt: `Identify likely failure modes for ${task.title} and propose counterfactual mitigation steps aligned to acceptance criteria.`,
        });
        const primaryCoverage = extractCoveredCriteria(primaryOutput.content, task);
        const shadowCoverage = extractCoveredCriteria(shadowOutput.content, task);
        const deltas = Array.from(shadowCoverage).filter((id) => !primaryCoverage.has(id));
        let mergedContent = primaryOutput.content;
        if (deltas.length > 0) {
            mergedContent += `\n\n[Counterfactual Enhancements]\n${shadowOutput.content}`;
        }
        const evaluation = adjudicator.evaluate
            ? await adjudicator.evaluate({
                mode: 'counterfactual-shadowing',
                content: mergedContent,
                supportingEvidence: [
                    ...(primaryOutput.evidence ?? []),
                    ...(shadowOutput.evidence ?? []),
                ],
                acceptanceCriteriaSatisfied: Array.from(new Set([...primaryCoverage, ...shadowCoverage])),
                residualRisks: [],
            })
            : [];
        const { artifact } = this.guard.enforce('counterfactual-shadowing', mergedContent, evaluation ?? [], [...(primaryOutput.evidence ?? []), ...(shadowOutput.evidence ?? [])]);
        return {
            artifact,
            mergedCoverage: Array.from(new Set([...primaryCoverage, ...shadowCoverage])),
            shadowDeltas: deltas,
        };
    }
}
exports.CounterfactualShadowingCoordinator = CounterfactualShadowingCoordinator;
