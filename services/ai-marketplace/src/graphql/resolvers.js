"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.marketplaceResolvers = void 0;
const marketplace_service_js_1 = require("../services/marketplace-service.js");
exports.marketplaceResolvers = {
    Query: {
        marketplaceRecommendations: async (_parent, args, context) => {
            const recommendations = await marketplace_service_js_1.marketplaceService.getRecommendations(context.userId, args.filter);
            return recommendations.map(rec => ({
                ...rec,
                experience: marketplace_service_js_1.marketplaceService.getExperience(rec.experienceId),
            }));
        },
        marketplaceBrowse: async (_parent, args) => {
            return marketplace_service_js_1.marketplaceService.browse(args.filter);
        },
        marketplaceExperience: async (_parent, args) => {
            return marketplace_service_js_1.marketplaceService.getExperience(args.id);
        },
        marketplaceInstalled: async (_parent, _args, context) => {
            return marketplace_service_js_1.marketplaceService.getInstalledExperiences(context.userId);
        },
        marketplacePreferences: async (_parent, _args, context) => {
            return marketplace_service_js_1.marketplaceService.getUserPreferences(context.userId);
        },
    },
    Mutation: {
        marketplaceInstall: async (_parent, args, context) => {
            return marketplace_service_js_1.marketplaceService.installExperience(context.userId, args.experienceId);
        },
        marketplaceUninstall: async (_parent, args, context) => {
            return marketplace_service_js_1.marketplaceService.uninstallExperience(context.userId, args.experienceId);
        },
        marketplaceRate: async (_parent, args, context) => {
            return marketplace_service_js_1.marketplaceService.rateExperience(context.userId, args.experienceId, args.rating);
        },
        marketplaceRecordUsage: async (_parent, args, context) => {
            await marketplace_service_js_1.marketplaceService.recordUsage(context.userId, args.experienceId, args.durationSeconds);
            return true;
        },
        marketplaceUpdatePreferences: async (_parent, args, context) => {
            return marketplace_service_js_1.marketplaceService.updateUserPreferences(context.userId, args.input);
        },
        marketplacePublish: async (_parent, args, context) => {
            const { input } = args;
            return marketplace_service_js_1.marketplaceService.publishExperience(context.userId, 'Publisher', // Would come from user profile in production
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
            });
        },
    },
};
