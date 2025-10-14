import AuthService from '../services/AuthService.js';
import { PubSub } from 'graphql-subscriptions';
const copilotResolvers = require('./resolvers.copilot.js');
const graphResolvers = require('./resolvers.graphops.js');
const aiResolvers = require('./resolvers.ai.js');
const annotationsResolvers = require('./resolvers.annotations.js');
import { v040Resolvers } from './resolvers/v040/index';
const pubsub = new PubSub();
const authService = new AuthService();
const goals = []; // replace with DB later
let seq = 1;
export const resolvers = {
    Query: {
        ...(copilotResolvers.Query || {}),
        ...(aiResolvers.Query || {}),
        ...(annotationsResolvers.Query || {}),
        ...(v040Resolvers.Query || {}),
        me: async (_, __, { user }) => {
            if (!user)
                throw new Error('Not authenticated');
            return user;
        },
        copilotGoals: async (_, { investigationId }) => {
            return investigationId
                ? goals.filter(g => g.investigationId === String(investigationId))
                : goals;
        }
    },
    Mutation: {
        ...(copilotResolvers.Mutation || {}),
        ...(graphResolvers.Mutation || {}),
        ...(aiResolvers.Mutation || {}),
        ...(annotationsResolvers.Mutation || {}),
        ...(v040Resolvers.Mutation || {}),
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
        }
    },
    Subscription: {
        ...(copilotResolvers.Subscription || {}),
        ...(aiResolvers.Subscription || {}),
        ...(annotationsResolvers.Subscription || {}),
        investigationUpdated: {
            subscribe: () => pubsub.asyncIterator(['INVESTIGATION_UPDATED'])
        },
        entityAdded: {
            subscribe: () => pubsub.asyncIterator(['ENTITY_ADDED'])
        }
    },
    User: {
        fullName: (user) => `${user.firstName} ${user.lastName}`
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
export default resolvers;
//# sourceMappingURL=resolvers-combined.js.map