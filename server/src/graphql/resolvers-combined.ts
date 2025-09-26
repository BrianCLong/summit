import AuthService from '../services/AuthService.js';
import { PubSub } from 'graphql-subscriptions';
const copilotResolvers = require('./resolvers.copilot.js');
const graphResolvers = require('./resolvers.graphops.js');
const aiResolvers = require('./resolvers.ai.js');
const annotationsResolvers = require('./resolvers.annotations.js');
import crystalResolvers from './resolvers.crystal.js';
import { randomUUID as uuidv4 } from 'crypto';

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
    ...(crystalResolvers.Query || {}),
    ...(copilotResolvers.Query || {}),
    ...(aiResolvers.Query || {}),
    ...(annotationsResolvers.Query || {}),
    me: async (_: any, __: any, { user }: Context): Promise<User> => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },
    roleMfaPolicies: async (_: any, __: any, { user }: Context) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      if (!authService.hasPermission(user, 'security:mfa:manage')) {
        throw new Error('Forbidden');
      }
      return authService.listRoleMfaPolicies();
    },
    copilotGoals: async (_: any, { investigationId }: CopilotGoalsArgs) => {
      return investigationId
        ? goals.filter((g) => g.investigationId === String(investigationId))
        : goals;
    },
  },

  Mutation: {
    ...(crystalResolvers.Mutation || {}),
    ...(copilotResolvers.Mutation || {}),
    ...(graphResolvers.Mutation || {}),
    ...(aiResolvers.Mutation || {}),
    ...(annotationsResolvers.Mutation || {}),
    login: async (_: any, { input }: { input: LoginInput }, { req }: Context) => {
      const { email, password } = input;
      const ipAddress = req?.ip;
      const userAgent = req?.get('User-Agent');

      return await authService.login(email, password, ipAddress, userAgent);
    },

    verifyMfa: async (
      _: any,
      { challengeId, code }: { challengeId: string; code: string },
    ) => {
      return await authService.verifyMfaChallenge(challengeId, code);
    },

    updateRoleMfaPolicy: async (
      _: any,
      { role, requireMfa }: { role: string; requireMfa: boolean },
      { user }: Context,
    ) => {
      if (!user) {
        throw new Error('Not authenticated');
      }
      if (!authService.hasPermission(user, 'security:mfa:manage')) {
        throw new Error('Forbidden');
      }
      return authService.updateRoleMfaPolicy(role, requireMfa);
    },

    register: async (_: any, { input }: { input: RegisterInput }) => {
      return await authService.register(input);
    },

    createCopilotGoal: async (_: any, { text, investigationId }: CreateCopilotGoalArgs) => {
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
    ...(crystalResolvers.Subscription || {}),
    ...(copilotResolvers.Subscription || {}),
    ...(aiResolvers.Subscription || {}),
    ...(annotationsResolvers.Subscription || {}),
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
