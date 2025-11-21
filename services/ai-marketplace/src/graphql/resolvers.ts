import { marketplaceService } from '../services/marketplace-service.js';
import type { MarketplaceFilter, UserPreferences } from '../models/types.js';

interface GraphQLContext {
  userId: string;
  tenantId?: string;
}

export const marketplaceResolvers = {
  Query: {
    marketplaceRecommendations: async (
      _parent: unknown,
      args: { filter?: MarketplaceFilter },
      context: GraphQLContext
    ) => {
      const recommendations = await marketplaceService.getRecommendations(
        context.userId,
        args.filter
      );

      return recommendations.map(rec => ({
        ...rec,
        experience: marketplaceService.getExperience(rec.experienceId),
      }));
    },

    marketplaceBrowse: async (
      _parent: unknown,
      args: { filter?: MarketplaceFilter }
    ) => {
      return marketplaceService.browse(args.filter);
    },

    marketplaceExperience: async (
      _parent: unknown,
      args: { id: string }
    ) => {
      return marketplaceService.getExperience(args.id);
    },

    marketplaceInstalled: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      return marketplaceService.getInstalledExperiences(context.userId);
    },

    marketplacePreferences: async (
      _parent: unknown,
      _args: unknown,
      context: GraphQLContext
    ) => {
      return marketplaceService.getUserPreferences(context.userId);
    },
  },

  Mutation: {
    marketplaceInstall: async (
      _parent: unknown,
      args: { experienceId: string },
      context: GraphQLContext
    ) => {
      return marketplaceService.installExperience(context.userId, args.experienceId);
    },

    marketplaceUninstall: async (
      _parent: unknown,
      args: { experienceId: string },
      context: GraphQLContext
    ) => {
      return marketplaceService.uninstallExperience(context.userId, args.experienceId);
    },

    marketplaceRate: async (
      _parent: unknown,
      args: { experienceId: string; rating: number },
      context: GraphQLContext
    ) => {
      return marketplaceService.rateExperience(
        context.userId,
        args.experienceId,
        args.rating
      );
    },

    marketplaceRecordUsage: async (
      _parent: unknown,
      args: { experienceId: string; durationSeconds: number },
      context: GraphQLContext
    ) => {
      await marketplaceService.recordUsage(
        context.userId,
        args.experienceId,
        args.durationSeconds
      );
      return true;
    },

    marketplaceUpdatePreferences: async (
      _parent: unknown,
      args: { input: Partial<UserPreferences> },
      context: GraphQLContext
    ) => {
      return marketplaceService.updateUserPreferences(context.userId, args.input);
    },

    marketplacePublish: async (
      _parent: unknown,
      args: {
        input: {
          name: string;
          description: string;
          persona: 'citizen' | 'business' | 'developer';
          category: string;
          tags: string[];
          capabilities: string[];
          supportedLocales: string[];
          version: string;
          pricingModel: 'free' | 'freemium' | 'subscription' | 'usage';
          basePrice?: number;
          currency?: string;
        };
      },
      context: GraphQLContext
    ) => {
      const { input } = args;
      return marketplaceService.publishExperience(
        context.userId,
        'Publisher', // Would come from user profile in production
        {
          name: input.name,
          description: input.description,
          persona: input.persona,
          category: input.category,
          tags: input.tags,
          capabilities: input.capabilities,
          supportedLocales: input.supportedLocales,
          version: input.version,
          pricing: {
            model: input.pricingModel,
            basePrice: input.basePrice,
            currency: input.currency || 'USD',
          },
          metadata: {},
        }
      );
    },
  },
};
