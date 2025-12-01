import { v4 as uuid } from 'uuid';
import type { GraphQLContext } from './context.js';
import type { FormField } from '../types.js';

export const resolvers = {
  Query: {
    citizenProfile: async (
      _parent: unknown,
      { id }: { id: string },
      { services }: GraphQLContext,
    ) => {
      return services.profileAggregator.getProfile(id);
    },

    findCitizenByIdentifier: async (
      _parent: unknown,
      { type, value }: { type: string; value: string },
      { services }: GraphQLContext,
    ) => {
      return services.profileAggregator.findByIdentifier(type, value);
    },

    serviceNeeds: async (
      _parent: unknown,
      { citizenId }: { citizenId: string },
      { services }: GraphQLContext,
    ) => {
      return services.proactiveResolver.predictServiceNeeds(citizenId);
    },

    pendingServiceNeeds: async (
      _parent: unknown,
      { citizenId }: { citizenId: string },
      { services }: GraphQLContext,
    ) => {
      return services.proactiveResolver.getPendingNeeds(citizenId);
    },

    autocompleteForm: async (
      _parent: unknown,
      { citizenId, fields }: { citizenId: string; fields: FormField[] },
      { services }: GraphQLContext,
    ) => {
      return services.formAutocomplete.autocompleteForm(citizenId, fields);
    },

    workloadMetrics: async (
      _parent: unknown,
      { period }: { period: string },
      { services }: GraphQLContext,
    ) => {
      return services.metrics.getMetrics(period);
    },

    aggregatedMetrics: async (
      _parent: unknown,
      { startDate, endDate }: { startDate: string; endDate: string },
      { services }: GraphQLContext,
    ) => {
      return services.metrics.getAggregatedMetrics(startDate, endDate);
    },

    workloadTargetStatus: async (
      _parent: unknown,
      _args: unknown,
      { services }: GraphQLContext,
    ) => {
      return services.metrics.isTargetMet();
    },
  },

  Mutation: {
    createCitizenProfile: async (
      _parent: unknown,
      args: {
        firstName: string;
        lastName: string;
        email: string;
        phone: string;
        dateOfBirth: string;
      },
      { services }: GraphQLContext,
    ) => {
      return services.profileAggregator.createProfile({
        id: uuid(),
        personal: {
          firstName: args.firstName,
          lastName: args.lastName,
          dateOfBirth: args.dateOfBirth,
        },
        contact: {
          email: args.email,
          phone: args.phone,
        },
        address: {
          street: '',
          city: '',
          state: '',
          zipCode: '',
          country: 'US',
        },
        documents: [],
        submissions: [],
      });
    },

    handleFormSubmission: async (
      _parent: unknown,
      args: {
        citizenId: string;
        formId: string;
        data: Array<{ key: string; value: string }>;
      },
      { services }: GraphQLContext,
    ) => {
      const dataObj = args.data.reduce(
        (acc, { key, value }) => ({ ...acc, [key]: value }),
        {} as Record<string, unknown>,
      );

      const result = await services.workflow.handleFormSubmission(
        args.citizenId,
        args.formId,
        dataObj,
      );

      // Record metrics
      services.metrics.recordSubmission({
        autoCompletedFields: result.autoResolved,
        totalFields: Object.keys(dataObj).length,
        reusedDataPoints: Object.keys(dataObj).length,
        manualOverrides: 0,
      });

      return result;
    },

    autoResolveServiceNeed: async (
      _parent: unknown,
      { needId, citizenId }: { needId: string; citizenId: string },
      { services }: GraphQLContext,
    ) => {
      const result = await services.proactiveResolver.autoResolve(needId, citizenId);
      services.metrics.recordProactiveResolution(result.resolved);
      return result;
    },

    predictServiceNeeds: async (
      _parent: unknown,
      { citizenId }: { citizenId: string },
      { services }: GraphQLContext,
    ) => {
      return services.proactiveResolver.predictServiceNeeds(citizenId);
    },

    notifyCitizen: async (
      _parent: unknown,
      { citizenId, needId }: { citizenId: string; needId: string },
      { services }: GraphQLContext,
    ) => {
      await services.proactiveResolver.notifyCitizen(citizenId, needId);
      return true;
    },

    runProactiveScan: async (
      _parent: unknown,
      { citizenIds }: { citizenIds: string[] },
      { services }: GraphQLContext,
    ) => {
      return services.workflow.runDailyProactiveScan(citizenIds);
    },
  },

  // Custom scalar for JSON
  JSON: {
    __serialize: (value: unknown) => value,
    __parseValue: (value: unknown) => value,
    __parseLiteral: (ast: { value: string }) => JSON.parse(ast.value),
  },
};
