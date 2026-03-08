"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.resolvers = void 0;
const AuthService_js_1 = __importDefault(require("../services/AuthService.js"));
const graphql_subscriptions_1 = require("graphql-subscriptions");
const resolvers_copilot_js_1 = require("./resolvers.copilot.js");
const resolvers_graphops_js_1 = require("./resolvers.graphops.js");
const resolvers_ai_js_1 = require("./resolvers.ai.js");
const resolvers_annotations_js_1 = require("./resolvers.annotations.js");
const index_js_1 = require("./resolvers/v040/index.js");
const activity_js_1 = require("./resolvers/activity.js");
const geoint_js_1 = require("./resolvers/geoint.js");
const resolvers_document_js_1 = require("./resolvers.document.js");
const ingestionResolvers_js_1 = require("./resolvers/ingestionResolvers.js");
const resolvers_er_js_1 = require("./resolvers.er.js");
const provenance_js_1 = require("./resolvers/provenance.js");
const pubsub = new graphql_subscriptions_1.PubSub();
const authService = new AuthService_js_1.default();
const copilotResolvers = resolvers_copilot_js_1.copilotResolvers;
const graphResolvers = resolvers_graphops_js_1.graphResolvers;
const aiResolvers = resolvers_ai_js_1.aiResolvers;
const annotationsResolvers = resolvers_annotations_js_1.annotationsResolvers;
const documentResolvers = resolvers_document_js_1.documentResolvers;
const goals = []; // replace with DB later
let seq = 1;
exports.resolvers = {
    Query: {
        ...(copilotResolvers.Query || {}),
        ...(aiResolvers.Query || {}),
        ...(annotationsResolvers.Query || {}),
        ...(index_js_1.v040Resolvers.Query || {}),
        ...(activity_js_1.activityResolvers.Query || {}),
        ...(geoint_js_1.geoIntResolvers.Query || {}),
        ...(documentResolvers.Query || {}),
        ...(resolvers_er_js_1.erResolvers.Query || {}),
        ...(provenance_js_1.provenanceResolvers.Query || {}),
        me: async (_, __, { user }) => {
            if (!user)
                throw new Error('Not authenticated');
            return user;
        },
        copilotGoals: async (_, { investigationId }) => {
            return investigationId
                ? goals.filter((g) => g.investigationId === String(investigationId))
                : goals;
        },
    },
    Mutation: {
        ...(copilotResolvers.Mutation || {}),
        ...(graphResolvers.Mutation || {}),
        ...(aiResolvers.Mutation || {}),
        ...(annotationsResolvers.Mutation || {}),
        ...(index_js_1.v040Resolvers.Mutation || {}),
        ...(documentResolvers.Mutation || {}),
        ...(resolvers_er_js_1.erResolvers.Mutation || {}),
        ...(provenance_js_1.provenanceResolvers.Mutation || {}),
        login: async (_, { input }, { req }) => {
            const { email, password } = input;
            const ipAddress = req?.ip;
            const userAgent = req?.get('User-Agent');
            return await authService.login(email, password, ipAddress, userAgent);
        },
        register: async (_, { input }) => {
            return await authService.register(input);
        },
        createCopilotGoal: async (_, { text, investigationId }) => {
            if (!text || !text.trim()) {
                throw new Error('Goal text is required');
            }
            const goal = {
                id: String(seq++),
                text: text.trim(),
                investigationId: investigationId ? String(investigationId) : null,
                createdAt: new Date().toISOString(),
            };
            goals.unshift(goal);
            return goal;
        },
        logout: async () => {
            return true;
        },
    },
    Subscription: {
        ...(copilotResolvers.Subscription || {}),
        ...(aiResolvers.Subscription || {}),
        ...(annotationsResolvers.Subscription || {}),
        ...(ingestionResolvers_js_1.ingestionResolvers.Subscription || {}),
        investigationUpdated: {
            subscribe: () => pubsub.asyncIterator(['INVESTIGATION_UPDATED']),
        },
        entityAdded: {
            subscribe: () => pubsub.asyncIterator(['ENTITY_ADDED']),
        },
    },
    User: {
        fullName: (user) => `${user.firstName} ${user.lastName}`,
    },
    Entity: {
        ...(annotationsResolvers.Entity || {}),
    },
    Investigation: {
        ...(annotationsResolvers.Investigation || {}),
    },
    Relationship: {
        ...(annotationsResolvers.Relationship || {}),
    },
};
exports.default = exports.resolvers;
