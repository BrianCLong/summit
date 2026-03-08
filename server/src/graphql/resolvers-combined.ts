import AuthService from '../services/AuthService.js';
import { PubSub } from 'graphql-subscriptions';
import { copilotResolvers as copilotResolversRaw } from './resolvers.copilot.js';
import { graphResolvers as graphResolversRaw } from './resolvers.graphops.js';
import { aiResolvers as aiResolversRaw } from './resolvers.ai.js';
import { annotationsResolvers as annotationsResolversRaw } from './resolvers.annotations.js';
import { v040Resolvers } from './resolvers/v040/index.js';
import { activityResolvers } from './resolvers/activity.js';
import { geoIntResolvers } from './resolvers/geoint.js';
import { documentResolvers as documentResolversRaw } from './resolvers.document.js';
import { ingestionResolvers } from './resolvers/ingestionResolvers.js';
import { randomUUID } from 'node:crypto';
import { erResolvers } from './resolvers.er.js';
import { provenanceResolvers } from './resolvers/provenance.js';

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
const copilotResolvers: any = copilotResolversRaw;
const graphResolvers: any = graphResolversRaw;
const aiResolvers: any = aiResolversRaw;
const annotationsResolvers: any = annotationsResolversRaw;
const documentResolvers: any = documentResolversRaw;

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
    ...(provenanceResolvers.Query || {}),
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
    ...(provenanceResolvers.Mutation || {}),
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
