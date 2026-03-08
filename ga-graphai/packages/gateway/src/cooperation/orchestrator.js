"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CooperationOrchestrator = void 0;
const promptOps_js_1 = require("../promptOps.js");
const counterfactualShadowing_js_1 = require("./counterfactualShadowing.js");
const causalChallengeGames_js_1 = require("./causalChallengeGames.js");
const crossEntropySwaps_js_1 = require("./crossEntropySwaps.js");
const proofOfUsefulWorkbook_js_1 = require("./proofOfUsefulWorkbook.js");
const semanticBraid_js_1 = require("./semanticBraid.js");
function ensureResource(id, registry) {
    const resource = registry.get(id);
    if (!resource) {
        throw new Error(`Resource ${id} not registered`);
    }
    return resource;
}
function collectResources(ids, registry) {
    return ids.map((id) => ensureResource(id, registry));
}
class CooperationOrchestrator {
    registry;
    ledger;
    braid = new semanticBraid_js_1.SemanticBraidCoordinator();
    shadow = new counterfactualShadowing_js_1.CounterfactualShadowingCoordinator();
    challenges = new causalChallengeGames_js_1.CausalChallengeGamesCoordinator();
    swaps = new crossEntropySwaps_js_1.CrossEntropySwapCoordinator();
    workbook = new proofOfUsefulWorkbook_js_1.ProofOfUsefulWorkbookCoordinator();
    guard = new promptOps_js_1.GuardedGenerator();
    constructor(registry, ledger) {
        this.registry = registry;
        this.ledger = ledger;
    }
    async execute(task, decision) {
        const resources = collectResources([...decision.primaryAssignments, ...decision.supportAssignments], this.registry);
        if (resources.length === 0) {
            throw new Error('No resources available for cooperation');
        }
        let artifact;
        switch (decision.mode) {
            case 'semantic-braid': {
                const assignments = new Map();
                const order = [
                    'spec',
                    'tests',
                    'risks',
                    'implementation',
                ];
                order.forEach((strand, index) => {
                    assignments.set(strand, resources[index % resources.length]);
                });
                const result = await this.braid.weave(task, assignments);
                artifact = result.artifact;
                break;
            }
            case 'counterfactual-shadowing': {
                const primary = resources[0];
                const shadow = resources[1] ?? resources[0];
                const adjudicator = resources[2] ?? resources[0];
                const result = await this.shadow.run(task, primary, shadow, adjudicator);
                artifact = result.artifact;
                break;
            }
            case 'causal-challenge-games': {
                const proposer = resources[0];
                const challenger = resources[1] ?? resources[0];
                const repairer = resources[2] ?? resources[0];
                const result = await this.challenges.run(task, proposer, challenger, repairer);
                artifact = result.artifact;
                break;
            }
            case 'cross-entropy-swaps': {
                const candidateA = resources[0];
                const candidateB = resources[1] ?? resources[0];
                const criticA = resources[2] ?? candidateA;
                const criticB = resources[3] ?? candidateB;
                const result = await this.swaps.adjudicate(task, candidateA, candidateB, criticA, criticB);
                artifact = result.artifact;
                break;
            }
            case 'proof-of-useful-workbook': {
                const result = await this.workbook.execute(task, resources[0]);
                artifact = result.artifact;
                break;
            }
            case 'federated-deliberation': {
                const votes = await Promise.all(resources.map(async (resource) => {
                    const output = await resource.generate({
                        task,
                        strand: 'implementation',
                        prompt: `Provide a localized recommendation for ${task.title}.`,
                    });
                    return {
                        resource,
                        weight: resource.profile.reliabilityScore,
                        content: output.content,
                    };
                }));
                const aggregate = votes
                    .sort((a, b) => b.weight - a.weight)
                    .slice(0, 3)
                    .map((vote) => `(${vote.weight.toFixed(2)}) ${vote.resource.profile.id}: ${vote.content}`)
                    .join('\n');
                artifact = this.guard.enforce('federated-deliberation', aggregate).artifact;
                break;
            }
            case 'auction-of-experts':
            default: {
                const outputs = await Promise.all(resources.map((resource) => resource.generate({
                    task,
                    strand: 'implementation',
                    prompt: `Provide contribution aligned to skills ${resource.profile.skills.join(', ')} for ${task.title}.`,
                })));
                const combined = outputs
                    .map((output, index) => `Contributor ${resources[index].profile.id}: ${output.content}`)
                    .join('\n');
                artifact = this.guard.enforce('auction-of-experts', combined).artifact;
                break;
            }
        }
        this.ledger.append({
            reqId: task.taskId,
            step: 'generator',
            input: { taskId: task.taskId, decision },
            output: artifact,
            modelId: `cooperation-${decision.mode}`,
            ckpt: 'n/a',
            prompt: 'cooperation-execution',
            params: { mode: decision.mode },
            policy: task.policy,
            tags: task.policyTags,
        });
        return { artifact, decision };
    }
}
exports.CooperationOrchestrator = CooperationOrchestrator;
