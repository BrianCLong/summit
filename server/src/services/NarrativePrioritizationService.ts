import { dbService } from './DatabaseService.js';
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
    mlScore: number;
  };
  priority: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  timestamp: Date;
}

export class NarrativePrioritizationService {
  private static instance: NarrativePrioritizationService;
  private logger = logger.child({ service: 'NarrativePrioritizationService' });

  private constructor() { }

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

      // 4. ML-based Signal Analysis
      const mlScore = await this.analyzeMLSignal(input.entities);

      // 5. Calculate Final Score (Weighted Average)
      // Weights: Text (25%), Graph (30%), History (25%), ML (20%)
      const score = (textScore * 0.25) + (graphScore * 0.3) + (historyScore * 0.25) + (mlScore * 0.2);

      const priority = this.mapScoreToPriority(score);

      const duration = Date.now() - startTime;
      this.logger.info({
        msg: 'Narrative prioritized',
        duration,
        score,
        priority,
        mlScore,
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
          mlScore,
        },
        priority,
        timestamp: new Date(),
      };
    } catch (error: any) {
      this.logger.error('Error prioritizing narrative:', error);
      throw error;
    }
  }

  private async analyzeTextSignal(text: string): Promise<number> {
    // Simple heuristic analysis
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

  private async analyzeMLSignal(entities: string[]): Promise<number> {
    const { advancedMLService } = await import('./AdvancedMLService.js');
    const { GNNService } = await import('./GNNService.js');

    try {
      // Fetch subgraph for these entities
      const driver = getNeo4jDriver();
      const session = driver.session();
      const query = `
            MATCH (n) WHERE n.name IN $entities OR n.id IN $entities
            MATCH (n)-[r]-(m)
            RETURN n, r, m LIMIT 100
        `;
      const result = await session.run(query, { entities });
      await session.close();

      // Convert to GNN format
      const nodes = new Map();
      const edges: any[] = [];
      result.records.forEach((row: any) => {
        const n = row.get('n');
        const m = row.get('m');
        nodes.set(n.elementId, n.properties);
        nodes.set(m.elementId, m.properties);
        edges.push({ source: n.elementId, target: m.elementId });
      });

      if (nodes.size === 0) return 0.5;

      const gnnData = GNNService.convertGraphData({ nodes: Array.from(nodes.values()), edges });
      const request = {
        model_id: 'prioritization_model_v1',
        node_features: Object.values(gnnData.node_features || {}),
        edge_index: [
          gnnData.edges.map((e: any) => e[0]),
          gnnData.edges.map((e: any) => e[1])
        ]
      };

      const prediction = await advancedMLService.predict(request as any);

      // Use average confidence as the score boost
      if (prediction.confidence_scores && prediction.confidence_scores.length > 0) {
        return prediction.confidence_scores.reduce((a: number, b: number) => a + b, 0) / prediction.confidence_scores.length;
      }

      return 0.5;
    } catch (e) {
      this.logger.warn('ML signal analysis failed, falling back to neutral', { error: e });
      return 0.5;
    }
  }

  private async analyzeGraphSignal(entities: string[]): Promise<number> {
    if (!entities || entities.length === 0) return 0.1;

    const driver = getNeo4jDriver();
    const session = driver.session();

    try {
      // Calculate average degree centrality AND clustering coefficient if available
      const query = `
            UNWIND $entities AS entityName
            MATCH (n) WHERE n.name = entityName OR n.id = entityName

            OPTIONAL MATCH (n)-[r]-()
            WITH n, count(r) as degree

            // Get clustering coefficient estimated property if it was set by NarrativeAnalysisService
            WITH n, degree, coalesce(n.clusteringCoefficient, 0) as cc

            // Check for critical connections
            OPTIONAL MATCH (n)-[:RELATED_TO|:OWNS|:CONTROLS]-(:Asset {critical: true})
            WITH n, degree, cc, count(*) as criticalConnections

            RETURN avg(
                (log(degree + 1) * 0.4) + (cc * 0.3) + (criticalConnections * 1.0)
            ) as graphScore
        `;

      const result = await session.run(query, { entities });

      if (result.records.length === 0) return 0.2;

      const rawScore = result.records[0].get('graphScore');
      const score = rawScore !== null ? rawScore : 0.2;

      // Normalize (heuristic: typical scores might be 0-5, we want 0-1)
      return Math.min(score / 5, 1.0);

    } catch (error: any) {
      this.logger.error('Error analyzing graph signal:', error);
      return 0.1; // Fallback
    } finally {
      await session.close();
    }
  }

  private async analyzeHistorySignal(source: string): Promise<number> {
    try {
      // Query Postgres for past behavior/credibility of the source
      const result = await dbService.query<{ reliability: number }>(
        'SELECT reliability FROM sources WHERE name = $1 OR url = $1 ORDER BY updated_at DESC LIMIT 1',
        [source]
      );

      if (result.rows.length > 0) {
        return Number(result.rows[0].reliability);
      }

      // Fallback to deterministic mock if source not in DB
      const hash = source.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0);
      return (hash % 100) / 100;
    } catch (error: any) {
      this.logger.error('Error analyzing history signal:', error);
      return 0.5; // Neutral fallback
    }
  }

  private mapScoreToPriority(score: number): 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' {
    if (score >= 0.8) return 'CRITICAL';
    if (score >= 0.6) return 'HIGH';
    if (score >= 0.4) return 'MEDIUM';
    return 'LOW';
  }
}

export const narrativePrioritizer = NarrativePrioritizationService.getInstance();
