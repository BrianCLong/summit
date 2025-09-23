import {
  LINEARX_SPEC,
  LinearXOrchestratorSpec,
  ProviderResolutionOptions,
  ProviderRoute,
  ToolContract,
  LinearXQuickNextStep,
  LinearXShortQuestionAnswer,
  LinearXKeyboardShortcut,
  LinearXCommandPaletteIntent,
  LinearXCommandPaletteCategory,
  LinearXCommandPaletteManifest,
  LinearXKeyboardShortcutMap,
  LinearXBoardEnhancement,
  LinearXGraphQLBinding,
  LinearXGuardedInvocationPlan,
  resolveProviderForTag,
  listToolContract,
  summarizeQuickStart,
  answerShortQuestion,
  listKeyboardShortcuts,
  listCommandPaletteIntents,
  listCommandPaletteCategories,
  listBoardEnhancements,
  listGraphQLBindings,
  planGuardedInvocationForBinding,
  buildCommandPaletteManifest,
  buildKeyboardShortcutMap,
  generateGraphQLSchemaSDL
} from "../../common-types/src/linearx";

import type {
  AssignmentPlan,
  AutomationCommand,
  AutomationMode,
  ManualControlPlan,
  TicketDescriptor,
  WorkParcelPlan,
  WorkerDescriptor,
} from '../../common-types/src/index.js';

export interface GraphQLResolverBlueprint {
  binding: LinearXGraphQLBinding;
  invocation: LinearXGuardedInvocationPlan;
  resolverSignature: string;
  guardrails: string[];
  relatedShortcuts: LinearXKeyboardShortcut[];
  relatedIntents: LinearXCommandPaletteIntent[];
}

export interface IntegrationBlueprint {
  quickSteps: string[];
  graphqlResolvers: GraphQLResolverBlueprint[];
  graphqlSchemaSDL: string;
  keyboardShortcuts: LinearXKeyboardShortcut[];
  keyboardShortcutMap: LinearXKeyboardShortcutMap;
  boardEnhancements: LinearXBoardEnhancement[];
  commandPaletteIntents: LinearXCommandPaletteIntent[];
  commandPaletteCategories: LinearXCommandPaletteCategory[];
  commandPaletteManifest: LinearXCommandPaletteManifest;
}

export interface ProviderSelectionResult {
  tag: string;
  provider: string;
  usedFallback: boolean;
  route?: ProviderRoute;
}

interface ManualOverride {
  readonly ticketId: string;
  readonly workerId: string;
}

const DEFAULT_GUIDED_PLAN: ManualControlPlan = {
  mode: 'guided',
  pauseBeforeNavigation: false,
  pauseBeforePrompt: true,
  pauseBeforeCapture: true,
};

const DEFAULT_MANUAL_PLAN: ManualControlPlan = {
  mode: 'manual',
  pauseBeforeNavigation: true,
  pauseBeforePrompt: true,
  pauseBeforeCapture: true,
};

const DEFAULT_AUTOMATION_PLAN: ManualControlPlan = {
  mode: 'auto',
  pauseBeforeNavigation: false,
  pauseBeforePrompt: false,
  pauseBeforeCapture: false,
};

function capabilityScore(ticket: TicketDescriptor, worker: WorkerDescriptor): number {
  const required = new Set(ticket.requiredCapabilities.map((cap) => cap.toLowerCase()));
  return worker.capabilities.reduce((score, capability) => {
    if (required.has(capability.skill.toLowerCase())) {
      return score + capability.weight;
    }
    return score;
  }, 0);
}

function automationPlanFor(mode: AutomationMode): ManualControlPlan {
  switch (mode) {
    case 'manual':
      return DEFAULT_MANUAL_PLAN;
    case 'guided':
      return DEFAULT_GUIDED_PLAN;
    default:
      return DEFAULT_AUTOMATION_PLAN;
  }
}

export class LinearXOrchestrator {
  private readonly spec: LinearXOrchestratorSpec;

  constructor(spec: LinearXOrchestratorSpec = LINEARX_SPEC) {
    this.spec = spec;
  }

  getSystemPrompt(): string {
    return this.spec.systemPrompt;
  }

  getQualityGates() {
    return { ...this.spec.qualityGates };
  }

  getFallbackChain(): string[] {
    return [...this.spec.fallbackChain];
  }

  selectProvider(tag: string, options: ProviderResolutionOptions = {}): ProviderSelectionResult {
    const provider = resolveProviderForTag(tag, options, this.spec);
    const route = this.spec.providerRouting.find((candidate) => candidate.tags.includes(tag));
    const usedFallback = route ? provider !== route.primary : provider !== this.spec.fallbackChain[0];
    return {
      tag,
      provider,
      usedFallback,
      route
    };
  }

  explainProvider(tag: string, options: ProviderResolutionOptions = {}) {
    const selection = this.selectProvider(tag, options);
    const chain = selection.route
      ? [selection.route.primary, ...selection.route.fallbacks]
      : [...this.spec.fallbackChain];
    return {
      ...selection,
      chain,
      qualityGates: this.getQualityGates(),
      reason: selection.usedFallback ? "fallback" : "primary"
    };
  }

  listProviderRoutes(): ProviderRoute[] {
    return [...this.spec.providerRouting];
  }

  listToolContracts(): ToolContract[] {
    return listToolContract() as ToolContract[];
  }

  getToolContract(name: string): ToolContract | undefined {
    return listToolContract(name) as ToolContract | undefined;
  }

  getQuickNextSteps(): LinearXQuickNextStep[] {
    return [...this.spec.quickNextSteps];
  }

  getQuickStartChecklist(): string[] {
    return summarizeQuickStart();
  }

  getShortAnswers(): LinearXShortQuestionAnswer[] {
    return [...this.spec.shortAnswers];
  }

  answerShortQuestion(question: string): string | undefined {
    return answerShortQuestion(question);
  }

  getKeyboardShortcuts(): LinearXKeyboardShortcut[] {
    return listKeyboardShortcuts() as LinearXKeyboardShortcut[];
  }

  getKeyboardShortcut(action: string): LinearXKeyboardShortcut | undefined {
    return listKeyboardShortcuts(action) as LinearXKeyboardShortcut | undefined;
  }

  getCommandPaletteIntents(): LinearXCommandPaletteIntent[] {
    return listCommandPaletteIntents() as LinearXCommandPaletteIntent[];
  }

  getCommandPaletteIntent(id: string): LinearXCommandPaletteIntent | undefined {
    return listCommandPaletteIntents(id) as LinearXCommandPaletteIntent | undefined;
  }

  getCommandPaletteCategories(): LinearXCommandPaletteCategory[] {
    return listCommandPaletteCategories() as LinearXCommandPaletteCategory[];
  }

  getCommandPaletteCategory(id: string): LinearXCommandPaletteCategory | undefined {
    return listCommandPaletteCategories(id) as LinearXCommandPaletteCategory | undefined;
  }

  getCommandPaletteManifest(): LinearXCommandPaletteManifest {
    return buildCommandPaletteManifest();
  }

  getBoardEnhancements(): LinearXBoardEnhancement[] {
    return listBoardEnhancements() as LinearXBoardEnhancement[];
  }

  getBoardEnhancement(feature: string): LinearXBoardEnhancement | undefined {
    return listBoardEnhancements(feature) as LinearXBoardEnhancement | undefined;
  }

  getGraphQLBindings(): LinearXGraphQLBinding[] {
    return listGraphQLBindings() as LinearXGraphQLBinding[];
  }

  getGraphQLBinding(field: string): LinearXGraphQLBinding | undefined {
    return listGraphQLBindings(field) as LinearXGraphQLBinding | undefined;
  }

  getGraphQLSchemaSDL(): string {
    return generateGraphQLSchemaSDL();
  }

  getKeyboardShortcutMap(): LinearXKeyboardShortcutMap {
    return buildKeyboardShortcutMap();
  }

  planGraphQLResolver(field: string): GraphQLResolverBlueprint | undefined {
    const binding = this.getGraphQLBinding(field);
    if (!binding) {
      return undefined;
    }
    const invocation = planGuardedInvocationForBinding(binding);
    if (!invocation) {
      return undefined;
    }
    const relatedShortcuts = binding.keyboardShortcutAction
      ? this.getKeyboardShortcuts().filter((shortcut) => shortcut.action === binding.keyboardShortcutAction)
      : [];
    const relatedIntents = binding.commandPaletteIntentId
      ? this.getCommandPaletteIntents().filter((intent) => intent.id === binding.commandPaletteIntentId)
      : [];
    const resolverSignature = `${binding.operation === "Mutation" ? "extend type Mutation" : "extend type Query"} { ${binding.field}(input: ${binding.inputType}) : ${binding.returnType} }`;
    return {
      binding,
      invocation,
      resolverSignature,
      guardrails: [...binding.guardrails],
      relatedShortcuts,
      relatedIntents
    };
  }

  buildIntegrationBlueprint(): IntegrationBlueprint {
    const resolverPlans = this.getGraphQLBindings()
      .map((binding) => this.planGraphQLResolver(binding.field))
      .filter((plan): plan is GraphQLResolverBlueprint => Boolean(plan));
    return {
      quickSteps: this.getQuickStartChecklist(),
      graphqlResolvers: resolverPlans,
      graphqlSchemaSDL: this.getGraphQLSchemaSDL(),
      keyboardShortcuts: this.getKeyboardShortcuts(),
      keyboardShortcutMap: this.getKeyboardShortcutMap(),
      boardEnhancements: this.getBoardEnhancements(),
      commandPaletteIntents: this.getCommandPaletteIntents(),
      commandPaletteCategories: this.getCommandPaletteCategories(),
      commandPaletteManifest: this.getCommandPaletteManifest()
    };
  }

  describe(): LinearXOrchestratorSpec {
    return {
      ...this.spec,
      providerRouting: this.listProviderRoutes(),
      fallbackChain: this.getFallbackChain(),
      toolContracts: this.listToolContracts(),
      quickNextSteps: this.getQuickNextSteps(),
      shortAnswers: this.getShortAnswers(),
      keyboardShortcuts: this.getKeyboardShortcuts(),
      commandPaletteIntents: this.getCommandPaletteIntents(),
      commandPaletteCategories: this.getCommandPaletteCategories(),
      boardEnhancements: this.getBoardEnhancements(),
      graphqlBindings: this.getGraphQLBindings()
    };
  }
}

export class WorkloadAllocator {
  private readonly overrides = new Map<string, string>();

  constructor(private readonly workers: readonly WorkerDescriptor[]) {
    if (!workers.length) {
      throw new Error('WorkloadAllocator requires at least one worker profile');
    }
  }

  public registerOverrides(overrides: readonly ManualOverride[]): void {
    overrides.forEach((override) => {
      this.overrides.set(override.ticketId, override.workerId);
    });
  }

  public plan(tickets: readonly TicketDescriptor[]): AssignmentPlan {
    const parcels: WorkParcelPlan[] = [];
    const unassigned: TicketDescriptor[] = [];
    const mutableWorkers = this.workers.map((worker) => ({ ...worker }));

    tickets
      .slice()
      .sort((a, b) => b.priority - a.priority)
      .forEach((ticket) => {
        const parcel = this.planTicket(ticket, mutableWorkers);
        if (parcel) {
          parcels.push(parcel);
        } else {
          unassigned.push(ticket);
        }
      });

    return { parcels, unassigned };
  }

  private planTicket(
    ticket: TicketDescriptor,
    workers: WorkerDescriptor[],
  ): WorkParcelPlan | undefined {
    const overrideWorkerId = this.overrides.get(ticket.id);
    const eligibleWorkers = workers
      .filter((worker) => worker.currentLoad < worker.maxConcurrent)
      .map((worker) => ({
        worker,
        score: capabilityScore(ticket, worker),
        remainingCapacity: worker.maxConcurrent - worker.currentLoad,
      }))
      .filter((entry) => entry.score > 0 || Boolean(overrideWorkerId));

    if (!eligibleWorkers.length) {
      return undefined;
    }

    let selection = eligibleWorkers[0];
    if (overrideWorkerId) {
      const overridden = eligibleWorkers.find((entry) => entry.worker.id === overrideWorkerId);
      if (overridden) {
        selection = overridden;
      }
    } else {
      selection = eligibleWorkers
        .slice()
        .sort((a, b) => {
          if (b.score === a.score) {
            return b.remainingCapacity - a.remainingCapacity;
          }
          return b.score - a.score;
        })[0];
    }

    selection.worker.currentLoad += 1;

    return {
      ticket,
      worker: selection.worker,
      manualControl: automationPlanFor(ticket.automationMode),
      expectedEffortMinutes: this.estimateEffort(ticket),
    };
  }

  private estimateEffort(ticket: TicketDescriptor): number {
    const base = 30;
    const priorityAdjustment = Math.max(0, ticket.priority - 1) * 5;
    const manualMultiplier = ticket.automationMode === 'manual' ? 2 : ticket.automationMode === 'guided' ? 1.3 : 1;
    return Math.ceil((base + priorityAdjustment) * manualMultiplier);
  }
}

export class AutomationCommandBuilder {
  constructor(private readonly allocator: WorkloadAllocator) {}

  public createCommands(tickets: readonly TicketDescriptor[]): AutomationCommand[] {
    const plan = this.allocator.plan(tickets);
    return plan.parcels.map((parcel) => this.createCommand(parcel));
  }

  public createCommand(parcel: WorkParcelPlan): AutomationCommand {
    const composedPrompt = this.composePrompt(parcel);
    const metadata = {
      manualControl: parcel.manualControl,
      workerId: parcel.worker.id,
      ticketId: parcel.ticket.id,
      entryUrl: parcel.ticket.entryUrl,
    };
    return { parcel, composedPrompt, metadata };
  }

  private composePrompt(parcel: WorkParcelPlan): string {
    const tuning = parcel.ticket.llmCommand.tuning;
    const instruction = tuning.systemInstruction.trim();
    const styleGuide = tuning.styleGuide.map((line) => `- ${line}`).join('\n');
    const safeguards = tuning.safetyClauses.map((line) => `- ${line}`).join('\n');
    const contextEntries = Object.entries(parcel.ticket.context)
      .map(([key, value]) => `${key}: ${value}`)
      .join('\n');

    const promptSections = [
      `System Instruction:\n${instruction}`,
      styleGuide ? `Style Guide:\n${styleGuide}` : undefined,
      safeguards ? `Safeguards:\n${safeguards}` : undefined,
      contextEntries ? `Context:\n${contextEntries}` : undefined,
      `User Prompt:\n${parcel.ticket.prompt}`,
    ].filter(Boolean);

    return promptSections.join('\n\n');
  }
}

export const orchestrator = new LinearXOrchestrator();

export function createLinearXOrchestrator(spec: LinearXOrchestratorSpec = LINEARX_SPEC) {
  return new LinearXOrchestrator(spec);
}
