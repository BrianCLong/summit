"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CausalChallengeGamesCoordinator = void 0;
const promptOps_js_1 = require("../promptOps.js");
function parseChallenges(content) {
    return content
        .split(/\n|;/)
        .map((line) => line.trim())
        .filter((line) => line.length > 0);
}
class CausalChallengeGamesCoordinator {
    guard = new promptOps_js_1.GuardedGenerator();
    async run(task, proposer, challenger, repairer) {
        const base = await proposer.generate({
            task,
            strand: 'implementation',
            prompt: `Propose solution for ${task.title} honoring all acceptance criteria.`,
        });
        const challengesOutput = await challenger.generate({
            task,
            strand: 'challenge',
            prompt: `Craft minimal counter-examples or stress cases for proposal: ${base.content}`,
        });
        const challenges = parseChallenges(challengesOutput.content);
        const failed = [];
        const passed = [];
        let revisedContent = base.content;
        for (const challenge of challenges) {
            if (new RegExp(challenge, 'i').test(base.content)) {
                passed.push(challenge);
                continue;
            }
            failed.push(challenge);
            const repaired = await repairer.generate({
                task,
                strand: 'implementation',
                prompt: `Repair solution to handle challenge: ${challenge}. Base: ${revisedContent}`,
            });
            revisedContent = repaired.content;
        }
        const { artifact } = this.guard.enforce('causal-challenge-games', revisedContent, [], [...(base.evidence ?? []), ...(challengesOutput.evidence ?? [])]);
        return {
            artifact,
            passedChallenges: passed,
            failedChallenges: failed,
        };
    }
}
exports.CausalChallengeGamesCoordinator = CausalChallengeGamesCoordinator;
