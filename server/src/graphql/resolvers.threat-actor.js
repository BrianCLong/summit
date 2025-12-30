const ThreatActorProfileService = require('../../services/ThreatActorProfileService');
const service = new ThreatActorProfileService();

const resolvers = {
  Query: {
    threatActor: async (_, { id }) => {
      return await service.getThreatActorProfile(id);
    },
    threatActors: async () => {
      // Basic list implementation - in real app would support pagination/filtering
      const session = service.driver.session();
      try {
        const result = await session.run('MATCH (a:ThreatActor) RETURN a LIMIT 25');
        // Return simple properties, nested fields will be handled by type resolvers
        return result.records.map(r => r.get('a').properties);
      } finally {
        await session.close();
      }
    },
    analyzeActorRelationships: async (_, { id }) => {
      return await service.analyzeAdversaryRelationships(id);
    }
  },
  Mutation: {
    createThreatActor: async (_, { input }) => {
      // Generate ID if not provided
      if (!input.id) {input.id = `actor-${Date.now()}`;}
      return await service.upsertThreatActor(input);
    },
    updateThreatActor: async (_, { id, input }) => {
      input.id = id;
      return await service.upsertThreatActor(input);
    },
    addBehavior: async (_, { actorId, behavior }) => {
      return await service.addBehavioralFingerprint(actorId, behavior);
    },
    linkTTP: async (_, { actorId, ttpId }) => {
      return await service.linkTTP(actorId, ttpId);
    },
    linkInfrastructure: async (_, { actorId, infraId }) => {
      return await service.linkInfrastructure(actorId, infraId);
    },
    addAttribution: async (_, { actorId, campaignId, confidence }) => {
      return await service.addAttribution(actorId, campaignId, confidence);
    },
    calculateConfidence: async (_, { actorId, evidenceIds }) => {
      return await service.calculateAttributionConfidence(actorId, evidenceIds);
    }
  },
  ThreatActor: {
    // Resolvers for nested fields to handle N+1 and partial loading

    ttps: async (parent) => {
       if (parent.ttps) {return parent.ttps;} // Return if already loaded
       const session = service.driver.session();
       try {
         const result = await session.run(
           'MATCH (a:ThreatActor {id: $id})-[:USES_TTP]->(t:TTP) RETURN t',
           { id: parent.id }
         );
         return result.records.map(r => r.get('t').properties);
       } finally {
         await session.close();
       }
    },

    infrastructure: async (parent) => {
       if (parent.infrastructure) {return parent.infrastructure;}
       const session = service.driver.session();
       try {
         const result = await session.run(
           'MATCH (a:ThreatActor {id: $id})-[:USES_INFRA]->(i:Infrastructure) RETURN i',
           { id: parent.id }
         );
         return result.records.map(r => r.get('i').properties);
       } finally {
         await session.close();
       }
    },

    attributions: async (parent) => {
       if (parent.attributions) {return parent.attributions;}
       const session = service.driver.session();
       try {
         const result = await session.run(
           'MATCH (a:ThreatActor {id: $id})-[r:ATTRIBUTED_TO]->(c:Campaign) RETURN c, r.confidence',
           { id: parent.id }
         );
         return result.records.map(r => ({
           campaign: r.get('c').properties,
           confidence: r.get('r.confidence')
         }));
       } finally {
         await session.close();
       }
    },

    relatedActors: async (parent) => {
       if (parent.relatedActors) {return parent.relatedActors;}
       const session = service.driver.session();
       try {
         const result = await session.run(
           'MATCH (a:ThreatActor {id: $id})-[:RELATED_TO]->(p:ThreatActor) RETURN p',
           { id: parent.id }
         );
         return result.records.map(r => r.get('p').properties);
       } finally {
         await session.close();
       }
    },

    behaviors: async (parent) => {
       if (parent.behaviors) {return parent.behaviors;}
       const session = service.driver.session();
       try {
         const result = await session.run(
           'MATCH (a:ThreatActor {id: $id})-[:EXHIBITS]->(b:Behavior) RETURN b',
           { id: parent.id }
         );
         return result.records.map(r => r.get('b').properties);
       } finally {
         await session.close();
       }
    }
  }
};

module.exports = resolvers;
