/**
 * OutcomeAmplifier - Main service class for Recursive Outcome Amplifier™
 */

import type { OutcomeNodeInput } from './models/OutcomeNode.js';
import type { CascadeMap, PropagationPath } from './models/CascadeMap.js';
import {
  getAmplificationByOrder,
  type OrderAmplification,
} from './models/CascadeMap.js';
import type { LeveragePoint } from './models/LeveragePoint.js';
import { filterLeveragePoints } from './models/LeveragePoint.js';
import {
  CascadeSimulator,
  type SimulationOptions,
} from './algorithms/CascadeSimulator.js';
import {
  createDefaultContext,
  type GraphContext,
} from './algorithms/PropagationEngine.js';
import type { Driver as Neo4jDriver } from 'neo4j-driver';
import pino from 'pino';

export interface AmplificationFactor {
  rootMagnitude: number;
  totalMagnitude: number;
  amplificationRatio: number;
  orderBreakdown: OrderAmplification[];
}

export interface OutcomeAmplifierConfig {
  neo4jDriver?: Neo4jDriver;
  defaultMaxOrder?: number;
  defaultProbabilityThreshold?: number;
  defaultMagnitudeThreshold?: number;
  enableCaching?: boolean;
}

export class OutcomeAmplifier {
  private simulator: CascadeSimulator;
  private context: GraphContext;
  private neo4jDriver?: Neo4jDriver;
  private logger: pino.Logger;
  private config: Required<OutcomeAmplifierConfig>;
  private cascadeCache: Map<string, CascadeMap>;

  constructor(config: OutcomeAmplifierConfig = {}) {
    this.config = {
      neo4jDriver: config.neo4jDriver,
      defaultMaxOrder: config.defaultMaxOrder ?? 5,
      defaultProbabilityThreshold: config.defaultProbabilityThreshold ?? 0.1,
      defaultMagnitudeThreshold: config.defaultMagnitudeThreshold ?? 0.1,
      enableCaching: config.enableCaching ?? true,
    };

    this.simulator = new CascadeSimulator();
    this.context = createDefaultContext();
    this.neo4jDriver = config.neo4jDriver;
    this.logger = pino({ name: 'OutcomeAmplifier' });
    this.cascadeCache = new Map();
  }

  /**
   * Main entry point: Amplify outcomes for an event
   */
  async amplifyOutcome(
    event: OutcomeNodeInput,
    options?: Partial<SimulationOptions>,
  ): Promise<CascadeMap> {
    this.logger.info({ event, options }, 'Amplifying outcome');

    const simulationOptions: SimulationOptions = {
      maxOrder: options?.maxOrder ?? this.config.defaultMaxOrder,
      probabilityThreshold:
        options?.probabilityThreshold ??
        this.config.defaultProbabilityThreshold,
      magnitudeThreshold:
        options?.magnitudeThreshold ?? this.config.defaultMagnitudeThreshold,
      includeWeakLinks: options?.includeWeakLinks ?? false,
      timeHorizon: options?.timeHorizon,
    };

    try {
      // Run simulation
      const cascade = this.simulator.simulateCascade(
        event,
        simulationOptions,
        this.context,
      );

      // Store in Neo4j if available
      if (this.neo4jDriver) {
        await this.storeCascadeInNeo4j(cascade);
      }

      // Cache result
      if (this.config.enableCaching) {
        this.cascadeCache.set(cascade.id, cascade);
      }

      this.logger.info(
        {
          cascadeId: cascade.id,
          totalNodes: cascade.totalNodes,
          criticalPaths: cascade.criticalPaths.length,
        },
        'Cascade simulation complete',
      );

      return cascade;
    } catch (error) {
      this.logger.error({ error, event }, 'Failed to amplify outcome');
      throw error;
    }
  }

  /**
   * Get cascade map by ID
   */
  async getCascadeMap(cascadeId: string): Promise<CascadeMap | null> {
    // Check cache first
    if (this.config.enableCaching && this.cascadeCache.has(cascadeId)) {
      return this.cascadeCache.get(cascadeId)!;
    }

    // Try Neo4j if available
    if (this.neo4jDriver) {
      return this.loadCascadeFromNeo4j(cascadeId);
    }

    return null;
  }

  /**
   * Find leverage points in a cascade
   */
  async findLeveragePoints(
    cascadeId: string,
    options: {
      topN?: number;
      minScore?: number;
      maxCost?: number;
    } = {},
  ): Promise<LeveragePoint[]> {
    const cascade = await this.getCascadeMap(cascadeId);
    if (!cascade) {
      throw new Error(`Cascade not found: ${cascadeId}`);
    }

    const leveragePoints = filterLeveragePoints(cascade.leveragePoints, {
      topN: options.topN ?? 10,
      minScore: options.minScore,
      maxCost: options.maxCost,
    });

    return leveragePoints;
  }

  /**
   * Get amplification path to specific node
   */
  async getAmplificationPath(
    cascadeId: string,
    targetNodeId: string,
  ): Promise<PropagationPath | null> {
    const cascade = await this.getCascadeMap(cascadeId);
    if (!cascade) {
      throw new Error(`Cascade not found: ${cascadeId}`);
    }

    return this.simulator.findPathToNode(cascade, targetNodeId);
  }

  /**
   * Get amplification analysis
   */
  async getAmplificationAnalysis(
    cascadeId: string,
  ): Promise<AmplificationFactor> {
    const cascade = await this.getCascadeMap(cascadeId);
    if (!cascade) {
      throw new Error(`Cascade not found: ${cascadeId}`);
    }

    const rootNode = cascade.nodes.find((n) => n.order === 1);
    if (!rootNode) {
      throw new Error('No root node found in cascade');
    }

    const totalMagnitude = cascade.nodes.reduce(
      (sum, node) => sum + node.magnitude,
      0,
    );

    return {
      rootMagnitude: rootNode.magnitude,
      totalMagnitude,
      amplificationRatio: cascade.amplificationFactor,
      orderBreakdown: getAmplificationByOrder(cascade),
    };
  }

  /**
   * List all cascades
   */
  async listCascades(
    limit: number = 20,
    offset: number = 0,
  ): Promise<CascadeMap[]> {
    if (this.neo4jDriver) {
      return this.listCascadesFromNeo4j(limit, offset);
    }

    // Fallback to cache
    const cachedCascades = Array.from(this.cascadeCache.values());
    return cachedCascades.slice(offset, offset + limit);
  }

  /**
   * Store cascade in Neo4j
   */
  private async storeCascadeInNeo4j(cascade: CascadeMap): Promise<void> {
    if (!this.neo4jDriver) return;

    const session = this.neo4jDriver.session();

    try {
      const query = `
        MERGE (cm:CascadeMap {id: $cascadeId})
        SET cm.rootEvent = $rootEvent,
            cm.maxOrder = $maxOrder,
            cm.totalNodes = $totalNodes,
            cm.amplificationFactor = $amplificationFactor,
            cm.createdAt = datetime($createdAt)

        WITH cm
        UNWIND $nodes AS node
        MERGE (o:Outcome {id: node.id})
        SET o.event = node.event,
            o.order = node.order,
            o.probability = node.probability,
            o.magnitude = node.magnitude,
            o.domain = node.domain,
            o.confidence = node.confidence,
            o.timeDelay = node.timeDelay
        MERGE (cm)-[:CONTAINS]->(o)

        WITH cm
        UNWIND $edges AS edge
        MATCH (parent:Outcome {id: edge.parentId})
        MATCH (child:Outcome {id: edge.childId})
        MERGE (parent)-[r:CAUSES]->(child)
        SET r.strength = edge.strength,
            r.evidenceQuality = edge.evidenceQuality

        RETURN cm
      `;

      const edges = cascade.nodes.flatMap((node) =>
        node.childNodes.map((childId) => {
          const child = cascade.nodes.find((n) => n.id === childId);
          return {
            parentId: node.id,
            childId,
            strength: child?.probability ?? 0.5,
            evidenceQuality: child?.evidenceStrength ?? 0.5,
          };
        }),
      );

      await session.run(query, {
        cascadeId: cascade.id,
        rootEvent: cascade.rootEvent,
        maxOrder: cascade.maxOrder,
        totalNodes: cascade.totalNodes,
        amplificationFactor: cascade.amplificationFactor,
        createdAt: cascade.createdAt.toISOString(),
        nodes: cascade.nodes.map((n) => ({
          id: n.id,
          event: n.event,
          order: n.order,
          probability: n.probability,
          magnitude: n.magnitude,
          domain: n.domain,
          confidence: n.confidence,
          timeDelay: n.timeDelay,
        })),
        edges,
      });

      this.logger.info({ cascadeId: cascade.id }, 'Cascade stored in Neo4j');
    } catch (error) {
      this.logger.error({ error }, 'Failed to store cascade in Neo4j');
      throw error;
    } finally {
      await session.close();
    }
  }

  /**
   * Load cascade from Neo4j
   */
  private async loadCascadeFromNeo4j(
    cascadeId: string,
  ): Promise<CascadeMap | null> {
    if (!this.neo4jDriver) return null;

    const session = this.neo4jDriver.session();

    try {
      const result = await session.run(
        `
        MATCH (cm:CascadeMap {id: $cascadeId})
        MATCH (cm)-[:CONTAINS]->(o:Outcome)
        OPTIONAL MATCH (o)-[r:CAUSES]->(child:Outcome)
        RETURN cm, collect(DISTINCT o) as nodes, collect(DISTINCT {parent: o.id, child: child.id, strength: r.strength}) as edges
      `,
        { cascadeId },
      );

      if (result.records.length === 0) return null;

      const record = result.records[0];
      const cmNode = record.get('cm');
      const nodes = record.get('nodes');

      // Reconstruct cascade map
      // This is simplified - full implementation would reconstruct all relationships
      const cascade: CascadeMap = {
        id: cmNode.properties.id,
        rootEvent: cmNode.properties.rootEvent,
        maxOrder: cmNode.properties.maxOrder,
        totalNodes: cmNode.properties.totalNodes,
        amplificationFactor: cmNode.properties.amplificationFactor,
        createdAt: new Date(cmNode.properties.createdAt),
        criticalPaths: [],
        leveragePoints: [],
        metadata: {},
        nodes: nodes.map((n: any) => ({
          id: n.properties.id,
          event: n.properties.event,
          order: n.properties.order,
          probability: n.properties.probability,
          magnitude: n.properties.magnitude,
          domain: n.properties.domain,
          confidence: n.properties.confidence,
          timeDelay: n.properties.timeDelay,
          evidenceStrength: n.properties.evidenceStrength || 0.5,
          parentNodes: [],
          childNodes: [],
          createdAt: new Date(),
        })),
      };

      return cascade;
    } catch (error) {
      this.logger.error({ error, cascadeId }, 'Failed to load cascade from Neo4j');
      return null;
    } finally {
      await session.close();
    }
  }

  /**
   * List cascades from Neo4j
   */
  private async listCascadesFromNeo4j(
    limit: number,
    offset: number,
  ): Promise<CascadeMap[]> {
    if (!this.neo4jDriver) return [];

    const session = this.neo4jDriver.session();

    try {
      const result = await session.run(
        `
        MATCH (cm:CascadeMap)
        RETURN cm
        ORDER BY cm.createdAt DESC
        SKIP $offset
        LIMIT $limit
      `,
        { offset, limit },
      );

      return result.records.map((record) => {
        const cm = record.get('cm');
        return {
          id: cm.properties.id,
          rootEvent: cm.properties.rootEvent,
          maxOrder: cm.properties.maxOrder,
          totalNodes: cm.properties.totalNodes,
          amplificationFactor: cm.properties.amplificationFactor,
          createdAt: new Date(cm.properties.createdAt),
          criticalPaths: [],
          leveragePoints: [],
          metadata: {},
          nodes: [],
        };
      });
    } catch (error) {
      this.logger.error({ error }, 'Failed to list cascades from Neo4j');
      return [];
    } finally {
      await session.close();
    }
  }

  /**
   * Clear cache
   */
  clearCache(): void {
    this.cascadeCache.clear();
    this.logger.info('Cache cleared');
  }

  /**
   * Get cache size
   */
  getCacheSize(): number {
    return this.cascadeCache.size;
  }
}
