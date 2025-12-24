const { getNeo4jDriver } = require('../config/database');
const logger = require('../utils/logger');
const { UserFacingError } = require('../lib/errors');

class ThreatActorProfileService {
  constructor() {
    this.driver = getNeo4jDriver();
    this.logger = logger;
  }

  // Helper to format node result with labels
  _formatNode(node) {
    if (!node) return null;
    return {
      ...node.properties,
      labels: node.labels
    };
  }

  /**
   * Create or update a threat actor profile
   */
  async upsertThreatActor(input) {
    const session = this.driver.session();
    try {
      const query = `
        MERGE (a:ThreatActor {id: $id})
        SET a += $props, a.updatedAt = datetime()
        RETURN a
      `;

      const props = { ...input };
      delete props.id; // ID is used for MERGE

      const result = await session.run(query, {
        id: input.id,
        props: props
      });

      return this._formatNode(result.records[0].get('a'));
    } catch (error) {
      this.logger.error('Error upserting threat actor:', error);
      throw new UserFacingError('Failed to upsert threat actor');
    } finally {
      await session.close();
    }
  }

  /**
   * Link a TTP to a Threat Actor
   * Requires TTP to exist.
   */
  async linkTTP(actorId, ttpId) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (a:ThreatActor {id: $actorId})
        MATCH (t:TTP {id: $ttpId})
        MERGE (a)-[:USES_TTP]->(t)
        RETURN t
      `;

      const result = await session.run(query, { actorId, ttpId });
      if (result.records.length === 0) throw new UserFacingError('Actor or TTP not found');
      return this._formatNode(result.records[0].get('t'));
    } catch (error) {
      this.logger.error('Error linking TTP:', error);
      if (error instanceof UserFacingError) throw error;
      throw new UserFacingError('Failed to link TTP');
    } finally {
      await session.close();
    }
  }

  /**
   * Link Infrastructure to a Threat Actor
   * Requires Infrastructure to exist.
   */
  async linkInfrastructure(actorId, infraId) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (a:ThreatActor {id: $actorId})
        MATCH (i:Infrastructure {id: $infraId})
        MERGE (a)-[:USES_INFRA]->(i)
        RETURN i
      `;

      const result = await session.run(query, { actorId, infraId });
      if (result.records.length === 0) throw new UserFacingError('Actor or Infrastructure not found');
      return this._formatNode(result.records[0].get('i'));
    } catch (error) {
      this.logger.error('Error linking Infrastructure:', error);
      if (error instanceof UserFacingError) throw error;
      throw new UserFacingError('Failed to link Infrastructure');
    } finally {
      await session.close();
    }
  }

  /**
   * Add Attribution to a Campaign
   * Requires Campaign to exist.
   */
  async addAttribution(actorId, campaignId, confidence) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (a:ThreatActor {id: $actorId})
        MATCH (c:Campaign {id: $campaignId})
        MERGE (a)-[r:ATTRIBUTED_TO]->(c)
        SET r.confidence = $confidence
        RETURN c, r.confidence
      `;

      const result = await session.run(query, { actorId, campaignId, confidence });
      if (result.records.length === 0) throw new UserFacingError('Actor or Campaign not found');

      return {
        campaign: this._formatNode(result.records[0].get('c')),
        confidence: result.records[0].get('r.confidence')
      };
    } catch (error) {
      this.logger.error('Error adding attribution:', error);
      if (error instanceof UserFacingError) throw error;
      throw new UserFacingError('Failed to add attribution');
    } finally {
      await session.close();
    }
  }

  /**
   * Get threat actor profile with all related data
   */
  async getThreatActorProfile(id) {
    const session = this.driver.session();
    try {
      const query = `
        MATCH (a:ThreatActor {id: $id})
        OPTIONAL MATCH (a)-[:USES_TTP]->(t:TTP)
        OPTIONAL MATCH (a)-[:USES_INFRA]->(i:Infrastructure)
        OPTIONAL MATCH (a)-[r:ATTRIBUTED_TO]->(campaign:Campaign)
        OPTIONAL MATCH (a)-[:RELATED_TO]->(peer:ThreatActor)
        RETURN a,
               collect(DISTINCT t) as ttps,
               collect(DISTINCT i) as infrastructure,
               collect(DISTINCT {campaign: campaign, confidence: r.confidence}) as attributions,
               collect(DISTINCT peer) as relatedActors
      `;

      const result = await session.run(query, { id });

      if (result.records.length === 0) return null;

      const record = result.records[0];
      const actor = this._formatNode(record.get('a'));

      return {
        ...actor,
        ttps: record.get('ttps').map(n => this._formatNode(n)),
        infrastructure: record.get('infrastructure').map(n => this._formatNode(n)),
        attributions: record.get('attributions').map(r => ({
          campaign: this._formatNode(r.campaign),
          confidence: r.confidence
        })),
        relatedActors: record.get('relatedActors').map(n => this._formatNode(n))
      };
    } catch (error) {
      this.logger.error('Error fetching threat actor profile:', error);
      throw new UserFacingError('Failed to fetch threat actor profile');
    } finally {
      await session.close();
    }
  }

  /**
   * Add behavioral fingerprint
   */
  async addBehavioralFingerprint(actorId, behavior) {
    const session = this.driver.session();
    try {
      // Generate ID for behavior if not present, but use signature for uniqueness
      const behaviorId = behavior.id || `behav-${Date.now()}`;

      const query = `
        MATCH (a:ThreatActor {id: $actorId})
        MERGE (b:Behavior {signature: $behavior.signature})
        ON CREATE SET b.id = $behaviorId, b += $behavior.props
        ON MATCH SET b += $behavior.props
        MERGE (a)-[:EXHIBITS]->(b)
        RETURN b
      `;

      const result = await session.run(query, {
        actorId,
        behaviorId,
        behavior: {
          signature: behavior.signature,
          props: behavior
        }
      });

      if (result.records.length === 0) throw new UserFacingError('Actor not found');

      return this._formatNode(result.records[0].get('b'));
    } catch (error) {
      this.logger.error('Error adding behavioral fingerprint:', error);
      if (error instanceof UserFacingError) throw error;
      throw new UserFacingError('Failed to add behavioral fingerprint');
    } finally {
      await session.close();
    }
  }

  /**
   * Calculate attribution confidence
   */
  async calculateAttributionConfidence(actorId, evidenceIds) {
    // Simplified logic: confidence increases with more matching TTPs and Infrastructure
    const session = this.driver.session();
    try {
      const query = `
        MATCH (a:ThreatActor {id: $actorId})
        MATCH (e:Evidence) WHERE e.id IN $evidenceIds
        // Find paths between actor and evidence through TTPs or Infra
        MATCH path = (a)-[:USES_TTP|USES_INFRA]-(node)-[:LINKED_TO]-(e)
        RETURN count(path) as links, collect(distinct node) as connectingNodes
      `;

      const result = await session.run(query, { actorId, evidenceIds });
      const links = result.records[0].get('links').toNumber();

      // Simple linear scoring for MVP
      const confidence = Math.min(links * 10, 100);
      return confidence;
    } catch (error) {
      this.logger.error('Error calculating confidence:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Analyze adversary relationships
   */
  async analyzeAdversaryRelationships(actorId) {
    const session = this.driver.session();
    try {
      // Find actors sharing similar TTPs or Infrastructure
      const query = `
        MATCH (a:ThreatActor {id: $actorId})-[:USES_TTP|USES_INFRA]->(shared)<-[:USES_TTP|USES_INFRA]-(other:ThreatActor)
        WHERE a <> other
        RETURN other, count(shared) as sharedCount, collect(shared.id) as sharedItems
        ORDER BY sharedCount DESC
      `;

      const result = await session.run(query, { actorId });

      return result.records.map(r => ({
        actor: this._formatNode(r.get('other')),
        overlapScore: r.get('sharedCount').toNumber(),
        sharedItems: r.get('sharedItems')
      }));
    } catch (error) {
      this.logger.error('Error analyzing relationships:', error);
      throw error;
    } finally {
      await session.close();
    }
  }

  async getThreatActors(limit = 25) {
    const session = this.driver.session();
    try {
      // Ensure limit is an integer
      const limitInt = parseInt(limit, 10) || 25;
      const result = await session.run(
        'MATCH (a:ThreatActor) RETURN a LIMIT $limit',
        { limit: limitInt }
      );
      return result.records.map(r => this._formatNode(r.get('a')));
    } catch (error) {
      this.logger.error('Error fetching threat actors list:', error);
      throw new UserFacingError('Failed to fetch threat actors');
    } finally {
      await session.close();
    }
  }
}

module.exports = ThreatActorProfileService;
