import type {
  GraphStore,
  AIService,
  AnonymizationService,
  AnonymizationTarget,
} from '../services-types';
import { createGraphStore } from './services/graph-store';
import { createAIService } from './services/ai';
import { createAnonymizationService } from './services/anonymization';

const store: GraphStore = createGraphStore();
const ai: AIService = createAIService();
const anonymizer: AnonymizationService = createAnonymizationService();

export const Query = {
  entities: (_: unknown, { filters }: { filters: any }) => store.getEntities(filters || {}),
  relationships: (_: unknown, { entityId }: { entityId: string }) =>
    store.getRelationships(entityId),
};

export const Mutation = {
  upsertEntity: async (_: unknown, { input }: { input: any }) => {
    const enriched = await ai.enrichEntity(input);
    return store.upsertEntity(enriched);
  },
  triggerAnonymization: async (
    _: unknown,
    { input }: { input: { targets?: AnonymizationTarget[]; dryRun?: boolean; requestedBy?: string } },
    context?: { user?: { id?: string } } & Record<string, any>,
  ) => {
    const normalizedScope = Array.isArray(input?.targets) && input.targets?.length
      ? (Array.from(new Set(input.targets)) as AnonymizationTarget[])
      : (['POSTGRES', 'NEO4J'] as AnonymizationTarget[]);

    const triggeredBy = input?.requestedBy ?? context?.user?.id ?? context?.actorId;

    return anonymizer.triggerRun({
      scope: normalizedScope,
      dryRun: Boolean(input?.dryRun),
      triggeredBy: triggeredBy ?? undefined,
    });
  },
};
