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

export const orchestrator = new LinearXOrchestrator();

export function createLinearXOrchestrator(spec: LinearXOrchestratorSpec = LINEARX_SPEC) {
  return new LinearXOrchestrator(spec);
}
