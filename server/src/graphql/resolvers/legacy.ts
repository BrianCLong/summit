import AuthService from '../../services/AuthService.js';
import { PubSub } from 'graphql-subscriptions';
import { v4 as uuidv4 } from 'uuid';
import { getNeo4jDriver } from '../../db/neo4j.js';
import { getPostgresPool } from '../../db/postgres.js';
import logger from '../../utils/logger.js';
import crypto from 'crypto';
import relationshipResolvers from './resolvers/relationship.js';

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

interface CreateInvestigationInput {
  title: string;
  description?: string;
  priority?: string;
  tags?: string[];
  metadata?: any;
}

interface CreateEntityInput {
  type: string;
  label: string;
  description?: string;
  properties?: any;
  confidence?: number;
  source?: string;
  position?: { x: number; y: number };
  investigationId?: string;
}

interface ImportEntitiesArgs {
  investigationId: string;
  text: string;
}

interface GenerateEntitiesArgs {
  investigationId: string;
  text: string;
}

interface CreateCopilotGoalArgs {
  text: string;
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

export const legacyResolvers = {
  Mutation: {
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

    createInvestigation: async (
      _: any,
      { input }: { input: CreateInvestigationInput },
      { user }: Context,
    ) => {
      if (!user) throw new Error('Not authenticated');

      const driver = getNeo4jDriver();
      const session = driver.session();

      try {
        const id = uuidv4();
        const now = new Date().toISOString();

        const result = await session.run(
          `CREATE (i:Investigation {
             id: $id,
             title: $title,
             description: $description,
             status: 'DRAFT',
             priority: $priority,
             tags: $tags,
             metadata: $metadata,
             entityCount: 0,
             relationshipCount: 0,
             createdBy: $createdBy,
             createdAt: datetime($now),
             updatedAt: datetime($now)
           })
           RETURN i`,
          {
            id,
            title: input.title,
            description: input.description || null,
            priority: input.priority || 'MEDIUM',
            tags: JSON.stringify(input.tags || []),
            metadata: JSON.stringify(input.metadata || {}),
            createdBy: user.id,
            now,
          },
        );

        const investigation = result.records[0].get('i').properties;

        logger.info(`Investigation created: ${id} by user ${user.id}`);
        return {
          ...investigation,
          createdBy: user,
          assignedTo: [],
        };
      } finally {
        await session.close();
      }
    },

    createEntity: async (
      _: any,
      { input }: { input: CreateEntityInput },
      { user }: Context,
    ) => {
      if (!user) throw new Error('Not authenticated');

      const driver = getNeo4jDriver();
      const session = driver.session();
      const pgPool = getPostgresPool();

      try {
        const id = uuidv4();
        const now = new Date().toISOString();

        const result = await session.run(
          `CREATE (e:Entity {
             id: $id,
             type: $type,
             label: $label,
             description: $description,
             properties: $properties,
             confidence: $confidence,
             source: $source,
             investigationId: $investigationId,
             createdBy: $createdBy,
             createdAt: datetime($now),
             updatedAt: datetime($now)
           })
           RETURN e`,
          {
            id,
            type: input.type,
            label: input.label,
            description: input.description || null,
            properties: JSON.stringify(input.properties || {}),
            confidence: input.confidence || 1.0,
            source: input.source || 'user_input',
            investigationId: input.investigationId,
            createdBy: user.id,
            now,
          },
        );

        const entity = result.records[0].get('e').properties;

        // Audit log
        const payloadHash = crypto
          .createHash('sha256')
          .update(JSON.stringify(input))
          .digest('hex');
        const auditLogQuery =
          'INSERT INTO "AuditLog" (user_id, timestamp, entity_type, payload_hash) VALUES ($1, $2, $3, $4)';
        await pgPool.query(auditLogQuery, [
          user.id,
          now,
          'Evidence',
          payloadHash,
        ]);

        // Publish subscription
        pubsub.publish('ENTITY_CREATED', {
          entityCreated: entity,
          investigationId: input.investigationId,
        });

        logger.info(`Entity created: ${id} by user ${user.id}`);
        return entity;
      } finally {
        await session.close();
      }
    },

    importEntitiesFromText: async (
      _: any,
      { investigationId, text }: ImportEntitiesArgs,
      { user }: Context,
    ) => {
      if (!user) throw new Error('Not authenticated');

      // Simple entity extraction
      const emailPattern =
        /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const phonePattern =
        /\b(?:\+?1[-.\ s]?)\(?[2-9][0-8][0-9]\)?[-.\ s]?[2-9][0-9]{2}[-.\ s]?[0-9]{4}\b/g;

      const entities: any[] = [];

      const emails = text.match(emailPattern) || [];
      emails.forEach((email) => {
        entities.push({
          id: uuidv4(),
          uuid: uuidv4(),
          type: 'EMAIL',
          label: email,
          description: 'Extracted from text',
          properties: { extractedFrom: 'text' },
          confidence: 0.8,
          source: 'text_extraction',
          verified: false,
          createdBy: user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      const phones = text.match(phonePattern) || [];
      phones.forEach((phone) => {
        entities.push({
          id: uuidv4(),
          uuid: uuidv4(),
          type: 'PHONE',
          label: phone,
          description: 'Extracted from text',
          properties: { extractedFrom: 'text' },
          confidence: 0.8,
          source: 'text_extraction',
          verified: false,
          createdBy: user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        });
      });

      return entities;
    },

    generateEntitiesFromText: async (
      _: any,
      { investigationId, text }: GenerateEntitiesArgs,
      context: Context,
    ) => {
      const { user } = context;
      if (!user) throw new Error('Not authenticated');

      const namePattern = /\b[A-Z][a-z]+(?:\s[A-Z][a-z]+)*\b/g;
      const names = Array.from(new Set(text.match(namePattern) || []));

      const entities: any[] = [];
      for (const label of names) {
        const entity = await legacyResolvers.Mutation.createEntity(
          _,
          {
            input: { type: 'PERSON', label, investigationId },
          },
          context,
        );
        entities.push(entity);
      }

      const relationships: any[] = [];
      for (let i = 0; i < entities.length; i++) {
        for (let j = i + 1; j < entities.length; j++) {
          const rel = await relationshipResolvers.Mutation.createRelationship(
            _,
            {
              input: {
                from: entities[i].id,
                to: entities[j].id,
                type: 'RELATED_TO',
                props: {},
              },
            },
            context,
          );
          relationships.push(rel);
        }
      }

      return { entities, relationships };
    },
  },
};
