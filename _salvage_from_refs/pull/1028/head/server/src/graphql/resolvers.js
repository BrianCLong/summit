const AuthService = require('../services/AuthService');
const { PubSub } = require('graphql-subscriptions');
const { copilotResolvers } = require('./resolvers.copilot'); // Import copilotResolvers
const { graphResolvers } = require('./resolvers.graphops');
const graphragResolvers = require('./resolvers/graphragResolvers');
const { aiResolvers } = require('./resolvers.ai');
const { coreResolvers } = require('./resolvers/coreResolvers');

const pubsub = new PubSub();
const authService = new AuthService();

const goals = []; // replace with DB later
let seq = 1;

const resolvers = {
  Query: {
    ...coreResolvers.Query, // Spread core Query resolvers (Entity, Relationship, Investigation)
    ...copilotResolvers.Query, // Spread copilot Query resolvers
    ...graphragResolvers.Query, // Spread GraphRAG Query resolvers
    ...aiResolvers.Query, // Spread AI/Analytics Query resolvers
    me: async (_, __, { user }) => {
      if (!user) throw new Error('Not authenticated');
      return user;
    },

    investigations: async (_, { page, limit, status, priority }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Return mock data for now
      return [
        {
          id: '1',
          title: 'Financial Network Analysis',
          description: 'Investigating suspicious financial transactions',
          status: 'ACTIVE',
          priority: 'HIGH',
          tags: ['finance', 'fraud'],
          metadata: {},
          entityCount: 45,
          relationshipCount: 67,
          createdBy: user,
          assignedTo: [user],
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        }
      ];
    },

    graphData: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Return mock graph data
      return {
        nodes: [
          {
            id: '1',
            label: 'John Doe',
            type: 'PERSON',
            properties: { age: 35 },
            position: { x: 100, y: 100 },
            size: 30,
            color: '#4caf50',
            verified: true
          },
          {
            id: '2',
            label: 'Acme Corp',
            type: 'ORGANIZATION',
            properties: { industry: 'Technology' },
            position: { x: 300, y: 150 },
            size: 40,
            color: '#2196f3',
            verified: false
          }
        ],
        edges: [
          {
            id: 'e1',
            source: '1',
            target: '2',
            label: 'WORKS_FOR',
            type: 'WORKS_FOR',
            properties: { since: '2020' },
            weight: 1.0,
            verified: true
          }
        ],
        metadata: {
          nodeCount: 2,
          edgeCount: 1,
          lastUpdated: new Date().toISOString()
        }
      };
    },

    linkPredictions: async (_, { investigationId, limit }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      return [
        {
          sourceEntityId: '1',
          targetEntityId: '3',
          predictedRelationshipType: 'KNOWS',
          confidence: 0.75,
          reasoning: '2 common connections suggest potential relationship'
        }
      ];
    },

    anomalyDetection: async (_, { investigationId }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      return [
        {
          entityId: '2',
          anomalyType: 'HIGH_CONNECTIVITY',
          severity: 0.8,
          description: 'Entity has unusually high connectivity (15 connections)',
          evidence: ['15 direct connections', 'Above 95th percentile']
        }
      ];
    },

    copilotGoals: async (_, { investigationId }) => {
      return investigationId
        ? goals.filter(g => g.investigationId === String(investigationId))
        : goals;
    }
  },

  Mutation: {
    ...coreResolvers.Mutation, // Spread core Mutation resolvers (Entity, Relationship, Investigation)
    ...copilotResolvers.Mutation, // Spread copilot Mutation resolvers
    ...graphResolvers.Mutation,
    ...graphragResolvers.Mutation, // Spread GraphRAG Mutation resolvers
    login: async (_, { input }, { req }) => {
      const { email, password } = input;
      const ipAddress = req.ip;
      const userAgent = req.get('User-Agent');
      
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

    createInvestigation: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const investigation = {
        id: require('uuid').v4(),
        title: input.title,
        description: input.description,
        status: 'ACTIVE',
        priority: input.priority || 'MEDIUM',
        tags: input.tags || [],
        metadata: input.metadata || {},
        entityCount: 0,
        relationshipCount: 0,
        createdBy: user,
        assignedTo: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      pubsub.publish('INVESTIGATION_CREATED', { investigationCreated: investigation });
      
      return investigation;
    },

    createEntity: async (_, { input }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      const entity = {
        id: require('uuid').v4(),
        uuid: require('uuid').v4(),
        type: input.type,
        label: input.label,
        description: input.description,
        properties: input.properties || {},
        confidence: input.confidence || 1.0,
        source: input.source || 'user_input',
        verified: false,
        position: input.position,
        createdBy: user,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      };
      
      pubsub.publish('ENTITY_ADDED', { 
        entityAdded: entity,
        investigationId: input.investigationId 
      });
      
      return entity;
    },

    importEntitiesFromText: async (_, { investigationId, text }, { user }) => {
      if (!user) throw new Error('Not authenticated');
      
      // Simple entity extraction
      const emailPattern = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g;
      const phonePattern = /\b(?:\+?1[-.\s]?)?\(?[2-9][0-8][0-9]\)?[-.\s]?[2-9][0-9]{2}[-.\s]?[0-9]{4}\b/g;
      
      const entities = [];
      
      const emails = text.match(emailPattern) || [];
      emails.forEach(email => {
        entities.push({
          id: require('uuid').v4(),
          uuid: require('uuid').v4(),
          type: 'EMAIL',
          label: email,
          description: 'Extracted from text',
          properties: { extractedFrom: 'text' },
          confidence: 0.8,
          source: 'text_extraction',
          verified: false,
          createdBy: user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      
      const phones = text.match(phonePattern) || [];
      phones.forEach(phone => {
        entities.push({
          id: require('uuid').v4(),
          uuid: require('uuid').v4(),
          type: 'PHONE',
          label: phone,
          description: 'Extracted from text',
          properties: { extractedFrom: 'text' },
          confidence: 0.8,
          source: 'text_extraction',
          verified: false,
          createdBy: user,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString()
        });
      });
      
      return entities;
    }
  },

  Subscription: {
    ...coreResolvers.Subscription, // Spread core Subscription resolvers
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

  // Add field resolvers from core resolvers
  Entity: coreResolvers.Entity,
  Investigation: coreResolvers.Investigation
};

module.exports = resolvers;
