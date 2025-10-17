import { CollaborativeContextBroker, type AgentAssignment, type BrokerOptions } from './collaboration.js';
import {
  ContextAwareDecomposer,
  type ContextAwareDecompositionOptions,
  type ContextSegment,
  type DecomposedContext
} from './contextDecomposer.js';
import { HierarchicalSummarizer, type HierarchicalSummarizerOptions, type HierarchicalSummaryResult } from './summarizer.js';
import { MetaPromptPlanner, type PlannedPrompt, type PlannerFeedback, type PlannerOptions } from './planner.js';
import {
  RecursiveSelfImprovementEngine,
  type RSIPIterationLog,
  type RSIPOptions,
  type RSIPRunResult
} from './rsip.js';
import { SelfConsensusEngine, type CandidateGenerationOptions, type ConsensusResult } from './consensus.js';
import {
  TokenAwareRetriever,
  type RetrievedContext,
  type RetrievableDocument,
  type TokenAwareRetrievalOptions
} from './retriever.js';
import { cosineSimilarity } from './utils.js';

export interface PromptEngineeringToolkitOptions {
  decomposition: ContextAwareDecompositionOptions;
  retrieval: TokenAwareRetrievalOptions;
  summarization: HierarchicalSummarizerOptions;
  planner: PlannerOptions;
  rsip: RSIPOptions;
  consensusThreshold?: number;
  broker: BrokerOptions;
}

export interface PromptOptimizationInput {
  task: string;
  complexity: number;
  segments: ContextSegment[];
  documents: RetrievableDocument[];
  initialPrompt: string;
  agents: string[];
  basePrompt: string;
}

export interface PromptOptimizationReport {
  decomposition: DecomposedContext;
  retrieval: RetrievedContext;
  plannedPrompt: PlannedPrompt;
  rsip: RSIPRunResult;
  consensus: ConsensusResult;
  summarization: HierarchicalSummaryResult;
  assignments: AgentAssignment[];
  iterationLogs: RSIPIterationLog[];
}

export class PromptEngineeringToolkit {
  private readonly decomposer: ContextAwareDecomposer;
  private readonly retriever: TokenAwareRetriever;
  private readonly summarizer: HierarchicalSummarizer;
  private readonly planner: MetaPromptPlanner;
  private readonly rsip: RecursiveSelfImprovementEngine;
  private readonly consensus: SelfConsensusEngine;
  private readonly broker: CollaborativeContextBroker;
  private readonly embed: ContextAwareDecompositionOptions['embed'];

  constructor(options: PromptEngineeringToolkitOptions) {
    this.decomposer = new ContextAwareDecomposer(options.decomposition);
    this.retriever = new TokenAwareRetriever(options.retrieval);
    this.summarizer = new HierarchicalSummarizer(options.summarization);
    this.planner = new MetaPromptPlanner(options.planner);
    this.rsip = new RecursiveSelfImprovementEngine(options.rsip);
    this.consensus = new SelfConsensusEngine(cosineSimilarity, options.consensusThreshold);
    this.broker = new CollaborativeContextBroker(options.broker);
    this.embed = options.decomposition.embed;
  }

  async optimise(input: PromptOptimizationInput): Promise<PromptOptimizationReport> {
    const decomposition = await this.decomposer.decompose(input.task, input.segments);
    const retrieval = await this.retriever.retrieve(input.task, input.documents);

    const plannedPrompt = this.planner.plan({ task: input.task, complexity: input.complexity });
    const summary = await this.summarizer.summarize(
      retrieval.documents.map(document => document.text).join('\n\n') || input.initialPrompt
    );

    const rsipResult = await this.rsip.run(`${plannedPrompt.prompt}\n\n${summary.finalSummary}`);

    const consensus = await this.consensus.generateConsensus({
      prompt: rsipResult.finalOutput,
      variants: 3,
      generator: async (prompt, index) => `${prompt}\n\nPerspective ${index + 1}: ${summary.finalSummary}`,
      embed: this.embed
    } as CandidateGenerationOptions);

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

  recordPlannerFeedback(feedback: PlannerFeedback): void {
    this.planner.recordFeedback(feedback);
  }
}
