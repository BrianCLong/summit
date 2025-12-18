import { getNeo4jDriver } from '../config/database';
import logger from '../utils/logger';
import { IntelCorroborationService } from './IntelCorroborationService';

interface VeracityScore {
  score: number; // 0-100
  confidence: string; // LOW, MEDIUM, HIGH
  sources: number;
  lastUpdated: number;
}

export class VeracityScoringService {
  private driver;
  private corroborationService: IntelCorroborationService;

  constructor() {
    this.driver = getNeo4jDriver();
    this.corroborationService = new IntelCorroborationService();
  }

  /**
   * Calculates and updates the veracity score for a given entity.
   * It fetches linked 'Provenance' or 'Source' nodes to evaluate evidence.
   */
  async scoreEntity(entityId: string): Promise<VeracityScore> {
    const session = this.driver.session();
    try {
      // Fetch evidence linked to the entity
      // Assuming a schema where Entity <--[MENTIONS]-- Document/Source
      // Or Entity has properties with source metadata.
      // For this MVP, we'll look for connected :Source or :Provenance nodes.
      const query = `
        MATCH (n:Entity {id: $id})
        OPTIONAL MATCH (n)<-[:MENTIONS|:SUPPORTS]-(s)
        RETURN n, collect(s) as sources
      `;

      const result = await session.run(query, { id: entityId });
      if (result.records.length === 0) {
        throw new Error(`Entity ${entityId} not found`);
      }

      const record = result.records[0];
      const sources = record.get('sources');

      // Calculate score
      let totalTrust = 0;
      let sourceCount = 0;

      for (const src of sources) {
        const props = src.properties || {};
        // Default trust if not present. trusted source = 0.8, others 0.5
        const trust = props.trustLevel || (props.type === 'verified' ? 0.9 : 0.5);
        totalTrust += trust;
        sourceCount++;
      }

      // Base score logic
      // If no sources, score is low/zero? Or neutral?
      // Let's say baseline 20, + points for sources.
      let rawScore = 20;
      if (sourceCount > 0) {
        const avgTrust = totalTrust / sourceCount;
        // Score = avgTrust * 100, boosted by count (logarithmic)
        rawScore = (avgTrust * 100) * (1 + Math.log10(sourceCount));
      }

      const score = Math.min(100, Math.round(rawScore));

      // Determine confidence
      let confidence = 'LOW';
      if (sourceCount > 5 && score > 70) confidence = 'HIGH';
      else if (sourceCount > 2) confidence = 'MEDIUM';

      const veracity: VeracityScore = {
        score,
        confidence,
        sources: sourceCount,
        lastUpdated: Date.now()
      };

      // Update the entity
      await session.run(`
        MATCH (n:Entity {id: $id})
        SET n.veracityScore = $score,
            n.veracityConfidence = $confidence,
            n.veracityUpdated = $ts
      `, {
        id: entityId,
        score: veracity.score,
        confidence: veracity.confidence,
        ts: veracity.lastUpdated
      });

      logger.info(`Updated veracity for ${entityId}: ${score} (${confidence})`);
      return veracity;

    } catch (err) {
      logger.error(`Failed to score entity ${entityId}`, err);
      throw err;
    } finally {
      await session.close();
    }
  }
}
