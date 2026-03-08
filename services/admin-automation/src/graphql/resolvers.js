"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const uuid_1 = require("uuid");
exports.resolvers = {
    Query: {
        citizenProfile: async (_parent, { id }, { services }) => {
            return services.profileAggregator.getProfile(id);
        },
        findCitizenByIdentifier: async (_parent, { type, value }, { services }) => {
            return services.profileAggregator.findByIdentifier(type, value);
        },
        serviceNeeds: async (_parent, { citizenId }, { services }) => {
            return services.proactiveResolver.predictServiceNeeds(citizenId);
        },
        pendingServiceNeeds: async (_parent, { citizenId }, { services }) => {
            return services.proactiveResolver.getPendingNeeds(citizenId);
        },
        autocompleteForm: async (_parent, { citizenId, fields }, { services }) => {
            return services.formAutocomplete.autocompleteForm(citizenId, fields);
        },
        workloadMetrics: async (_parent, { period }, { services }) => {
            return services.metrics.getMetrics(period);
        },
        aggregatedMetrics: async (_parent, { startDate, endDate }, { services }) => {
            return services.metrics.getAggregatedMetrics(startDate, endDate);
        },
        workloadTargetStatus: async (_parent, _args, { services }) => {
            return services.metrics.isTargetMet();
        },
    },
    Mutation: {
        createCitizenProfile: async (_parent, args, { services }) => {
            return services.profileAggregator.createProfile({
                id: (0, uuid_1.v4)(),
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
        handleFormSubmission: async (_parent, args, { services }) => {
            const dataObj = args.data.reduce((acc, { key, value }) => ({ ...acc, [key]: value }), {});
            const result = await services.workflow.handleFormSubmission(args.citizenId, args.formId, dataObj);
            // Record metrics
            services.metrics.recordSubmission({
                autoCompletedFields: result.autoResolved,
                totalFields: Object.keys(dataObj).length,
                reusedDataPoints: Object.keys(dataObj).length,
                manualOverrides: 0,
            });
            return result;
        },
        autoResolveServiceNeed: async (_parent, { needId, citizenId }, { services }) => {
            const result = await services.proactiveResolver.autoResolve(needId, citizenId);
            services.metrics.recordProactiveResolution(result.resolved);
            return result;
        },
        predictServiceNeeds: async (_parent, { citizenId }, { services }) => {
            return services.proactiveResolver.predictServiceNeeds(citizenId);
        },
        notifyCitizen: async (_parent, { citizenId, needId }, { services }) => {
            await services.proactiveResolver.notifyCitizen(citizenId, needId);
            return true;
        },
        runProactiveScan: async (_parent, { citizenIds }, { services }) => {
            return services.workflow.runDailyProactiveScan(citizenIds);
        },
    },
    // Custom scalar for JSON
    JSON: {
        __serialize: (value) => value,
        __parseValue: (value) => value,
        __parseLiteral: (ast) => JSON.parse(ast.value),
    },
};
