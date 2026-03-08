"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.PromptEngineeringToolkit = void 0;
const collaboration_js_1 = require("./collaboration.js");
const contextDecomposer_js_1 = require("./contextDecomposer.js");
const summarizer_js_1 = require("./summarizer.js");
const planner_js_1 = require("./planner.js");
const rsip_js_1 = require("./rsip.js");
const consensus_js_1 = require("./consensus.js");
const retriever_js_1 = require("./retriever.js");
const utils_js_1 = require("./utils.js");
class PromptEngineeringToolkit {
    decomposer;
    retriever;
    summarizer;
    planner;
    rsip;
    consensus;
    broker;
    embed;
    constructor(options) {
        this.decomposer = new contextDecomposer_js_1.ContextAwareDecomposer(options.decomposition);
        this.retriever = new retriever_js_1.TokenAwareRetriever(options.retrieval);
        this.summarizer = new summarizer_js_1.HierarchicalSummarizer(options.summarization);
        this.planner = new planner_js_1.MetaPromptPlanner(options.planner);
        this.rsip = new rsip_js_1.RecursiveSelfImprovementEngine(options.rsip);
        this.consensus = new consensus_js_1.SelfConsensusEngine(utils_js_1.cosineSimilarity, options.consensusThreshold);
        this.broker = new collaboration_js_1.CollaborativeContextBroker(options.broker);
        this.embed = options.decomposition.embed;
    }
    async optimise(input) {
        const decomposition = await this.decomposer.decompose(input.task, input.segments);
        const retrieval = await this.retriever.retrieve(input.task, input.documents);
        const plannedPrompt = this.planner.plan({ task: input.task, complexity: input.complexity });
        const summary = await this.summarizer.summarize(retrieval.documents.map(document => document.text).join('\n\n') || input.initialPrompt);
        const rsipResult = await this.rsip.run(`${plannedPrompt.prompt}\n\n${summary.finalSummary}`);
        const consensus = await this.consensus.generateConsensus({
            prompt: rsipResult.finalOutput,
            variants: 3,
            generator: async (prompt, index) => `${prompt}\n\nPerspective ${index + 1}: ${summary.finalSummary}`,
            embed: this.embed
        });
        for (const segment of decomposition.selected) {
            this.broker.upsert({ id: segment.id, content: segment.text, lastUpdated: Date.now() });
        }
        const assignments = this.broker.assignAgents(input.agents, input.basePrompt, Date.now() - 1000);
        return {
            decomposition,
            retrieval,
            plannedPrompt,
            rsip: rsipResult,
            consensus,
            summarization: summary,
            assignments,
            iterationLogs: rsipResult.logs
        };
    }
    recordPlannerFeedback(feedback) {
        this.planner.recordFeedback(feedback);
    }
}
exports.PromptEngineeringToolkit = PromptEngineeringToolkit;
