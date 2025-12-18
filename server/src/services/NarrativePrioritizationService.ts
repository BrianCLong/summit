import { getNeo4jDriver } from '../db/neo4j.js';
import logger from '../utils/logger.js';

interface NarrativeInput {
  text: string;
  entities: string[];
  source: string;
  metadata?: any;
}

interface PrioritizationResult {
  score: number;
  breakdown: {
    textScore: number;
    graphScore: number;
    historyScore: number;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
}

export class NarrativePrioritizationService {
  private static instance: NarrativePrioritizationService;
  private logger = logger.child({ service: 'NarrativePrioritizationService' });

  private constructor() {}

  static getInstance(): NarrativePrioritizationService {
    if (!NarrativePrioritizationService.instance) {
      NarrativePrioritizationService.instance = new NarrativePrioritizationService();
    }
    return NarrativePrioritizationService.instance;
  }

  /**
   * Cross-correlates text, graph, and history to assign a priority score.
   */
  async prioritize(input: NarrativeInput): Promise<PrioritizationResult> {
    const startTime = Date.now();
    try {
      // 1. Text Signal Analysis
      const textScore = await this.analyzeTextSignal(input.text);

      // 2. Entity Graph Signal Analysis
      const graphScore = await this.analyzeGraphSignal(input.entities);

      // 3. Historical Behavior Signal Analysis
      const historyScore = await this.analyzeHistorySignal(input.source);

      // 4. Calculate Final Score (Weighted Average)
      // Weights: Text (30%), Graph (40%), History (30%)
      const score = (textScore * 0.3) + (graphScore * 0.4) + (historyScore * 0.3);

      const priority = this.mapScoreToPriority(score);

      const duration = Date.now() - startTime;
      this.logger.info({
        msg: 'Narrative prioritized',
        duration,
        score,
        priority,
        input: {
            entities: input.entities,
            source: input.source
        }
      });

      return {
        score,
        breakdown: {
          textScore,
          graphScore,
          historyScore,
        },
        priority,
        timestamp: new Date(),
      };
    } catch (error) {
      this.logger.error('Error prioritizing narrative:', error);
      throw error;
    }
  }

  private async analyzeTextSignal(text: string): Promise<number> {
    // Simple heuristic analysis
    // In a real system, this would call ContentAnalyzer or an LLM
    let score = 0.5; // Base score

    const urgentKeywords = ['urgent', 'critical', 'attack', 'breach', 'immediate', 'danger'];
    const highImpactKeywords = ['infrastructure', 'finance', 'election', 'grid', 'military'];

    const lowerText = text.toLowerCase();

    for (const word of urgentKeywords) {
      if (lowerText.includes(word)) score += 0.1;
    }

    for (const word of highImpactKeywords) {
      if (lowerText.includes(word)) score += 0.15;
    }

    // Cap at 1.0
    return Math.min(score, 1.0);
  }

  private async analyzeGraphSignal(entities: string[]): Promise<number> {
    if (!entities || entities.length === 0) return 0.1;

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
        // Calculate average degree centrality of mentioned entities
        // and check if they are connected to critical assets
        const query = `
            UNWIND $entities AS entityName
            MATCH (n) WHERE n.name = entityName OR n.id = entityName

            // Get degree centrality approximation
            OPTIONAL MATCH (n)-[r]-()
            WITH n, count(r) as degree

            // Check for critical connections (e.g., to Assets)
            OPTIONAL MATCH (n)-[:RELATED_TO|:OWNS|:CONTROLS]-(:Asset {critical: true})
            WITH n, degree, count(*) as criticalConnections

            RETURN avg(
                (log(degree + 1) * 0.5) + (criticalConnections * 1.0)
            ) as graphScore
        `;

        const result = await session.run(query, { entities });

        if (result.records.length === 0) return 0.2;

        const rawScore = result.records[0].get('graphScore');
        const score = rawScore !== null ? rawScore : 0.2;

        // Normalize (heuristic: typical scores might be 0-5, we want 0-1)
        return Math.min(score / 5, 1.0);

    } catch (error) {
        this.logger.error('Error analyzing graph signal:', error);
        return 0.1; // Fallback
    } finally {
        await session.close();
    }
  }

  private async analyzeHistorySignal(source: string): Promise<number> {
    // Mock implementation for source history
    // TODO: Connect to Postgres 'sources' table to retrieve actual credibility score and history.
    // In a real system, this would query Postgres for past behavior/credibility

    // Deterministic mock based on source string
    const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
    const normalized = (hash % 100) / 100;

    return normalized;
  }

  private mapScoreToPriority(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  }
}

export const narrativePrioritizer = NarrativePrioritizationService.getInstance();
