import AuthService from '../services/AuthService.js';
import { PubSub } from 'graphql-subscriptions';
import copilotResolvers from './resolvers.copilot';
// eslint-disable-next-line @typescript-eslint/no-var-requires
const graphResolversModule = require('./resolvers.graphops');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const aiResolversModule = require('./resolvers.ai');
// eslint-disable-next-line @typescript-eslint/no-var-requires
const annotationsResolvers = require('./resolvers.annotations') as any;
import { v040Resolvers } from './resolvers/v040/index';
import { activityResolvers } from './resolvers/activity';
import { geoIntResolvers } from './resolvers/geoint';
import { documentResolvers } from './resolvers.document';
import { ingestionResolvers } from './resolvers/ingestionResolvers';
import { randomUUID } from 'node:crypto';
import { erResolvers } from './resolvers.er';

// Extract from CommonJS module exports
const graphResolvers = graphResolversModule.graphResolvers || graphResolversModule;
const aiResolvers = aiResolversModule.aiResolvers || aiResolversModule;

interface User {
  id: string;
  email?: string;
  firstName?: string;
  lastName?: string;
  role?: string;
  permissions?: string[];
}

interface Context {
  user?: User;
  req?: any;
  pubsub?: PubSub;
}

interface LoginInput {
  email: string;
  password: string;
}

interface RegisterInput {
  email: string;
  password: string;
  firstName?: string;
  lastName?: string;
}

interface CreateCopilotGoalArgs {
  text: string;
  investigationId?: string;
}

interface CopilotGoalsArgs {
  investigationId?: string;
}

const pubsub = new PubSub();
const authService = new AuthService();

const goals: Array<{
  id: string;
  text: string;
  investigationId: string | null;
  createdAt: string;
}> = []; // replace with DB later
let seq = 1;

export const resolvers = {
  Query: {
    ...(copilotResolvers.Query || {}),
    ...(aiResolvers.Query || {}),
    ...(annotationsResolvers.Query || {}),
    ...(v040Resolvers.Query || {}),
    ...(activityResolvers.Query || {}),
    ...(geoIntResolvers.Query || {}),
    ...(documentResolvers.Query || {}),
    ...(erResolvers.Query || {}),
    me: async (_: any, __: any, { user }: Context): Promise<User> => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },
    copilotGoals: async (_: any, { investigationId }: CopilotGoalsArgs) => {
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
    ...(v040Resolvers.Mutation || {}),
    ...(documentResolvers.Mutation || {}),
    ...(erResolvers.Mutation || {}),
    login: async (
      _: any,
      { input }: { input: LoginInput },
      { req }: Context,
    ) => {
      const { email, password } = input;
      const ipAddress = req?.ip;
      const userAgent = req?.get('User-Agent');

      return await authService.login(email, password, ipAddress, userAgent);
    },

    register: async (_: any, { input }: { input: RegisterInput }) => {
      return await authService.register(input);
    },

    createCopilotGoal: async (
      _: any,
      { text, investigationId }: CreateCopilotGoalArgs,
    ) => {
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
    ...(ingestionResolvers.Subscription || {}),
    investigationUpdated: {
      subscribe: () => pubsub.asyncIterator(['INVESTIGATION_UPDATED']),
    },

    entityAdded: {
      subscribe: () => pubsub.asyncIterator(['ENTITY_ADDED']),
    },
  },

  User: {
    fullName: (user: User) => `${user.firstName} ${user.lastName}`,
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
