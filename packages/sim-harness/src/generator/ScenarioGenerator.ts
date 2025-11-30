/**
 * Scenario Generator - Creates synthetic graph data for testing
 */

import { SeededRandom } from '../utils/random.js';
import { SafetyGuard } from '../utils/safety.js';
import type {
  AttributeDistribution,
  Entity,
  EntityTemplate,
  ExpectedOutcomes,
  GeneratedScenario,
  GeneratorOptions,
  Relationship,
  RelationshipTemplate,
  ScenarioTemplate,
  Signal,
} from '../types/index.js';
import { v4 as uuidv4 } from 'uuid';

export class ScenarioGenerator {
  private rng: SeededRandom;
  private safetyGuard: SafetyGuard;
  private template: ScenarioTemplate;

  constructor(options: GeneratorOptions) {
    const template =
      typeof options.template === 'string'
        ? this.loadTemplate(options.template)
        : options.template;

    // Merge params with template defaults
    this.template = {
      ...template,
      params: {
        ...template.params,
        ...options.params,
      },
    };

    const seed = this.template.params.seed || Date.now();
    this.rng = new SeededRandom(seed);

    this.safetyGuard = new SafetyGuard({
      requireTestPrefix: false, // Not applicable for generation
      blockProductionUrls: false,
      maxDataSize: 10000,
    });
  }

  /**
   * Generate complete scenario
   */
  async generate(): Promise<GeneratedScenario> {
    const scenarioId = `scenario-${uuidv4()}`;

    // Generate entities
    const entities = this.generateEntities();

    // Generate relationships
    const relationships = this.generateRelationships(entities);

    // Validate data size
    this.safetyGuard.validateDataSize(entities.length, relationships.length);

    // Generate signals/anomalies
    const signals = this.generateSignals(entities);

    // Compute expected outcomes
    const expectedOutcomes = this.computeExpectedOutcomes(
      entities,
      relationships,
      signals,
    );

    return {
      id: scenarioId,
      name: this.template.name,
      type: this.template.type,
      description: this.template.description,
      timestamp: new Date().toISOString(),
      seed: this.template.params.seed,
      entities,
      relationships,
      signals,
      expectedOutcomes,
    };
  }

  /**
   * Generate entities from template
   */
  private generateEntities(): Entity[] {
    const entities: Entity[] = [];

    for (const entityTemplate of this.template.entities) {
      const count = entityTemplate.distribution.count;

      for (let i = 0; i < count; i++) {
        const entity: Entity = {
          type: entityTemplate.type,
          name: this.generateEntityName(entityTemplate.type, i),
          properties: this.generateAttributes(
            entityTemplate.distribution.attributes || {},
          ),
        };

        entities.push(entity);
      }
    }

    return entities;
  }

  /**
   * Generate entity name
   */
  private generateEntityName(type: string, index: number): string {
    const prefixes: Record<string, string[]> = {
      PERSON: [
        'Alex',
        'Jordan',
        'Morgan',
        'Casey',
        'Riley',
        'Taylor',
        'Quinn',
        'Avery',
      ],
      ORGANIZATION: [
        'Alpha',
        'Beta',
        'Gamma',
        'Delta',
        'Epsilon',
        'Zeta',
        'Eta',
        'Theta',
      ],
      LOCATION: [
        'North',
        'South',
        'East',
        'West',
        'Central',
        'Upper',
        'Lower',
        'New',
      ],
    };

    const suffixes: Record<string, string[]> = {
      PERSON: [
        'Smith',
        'Johnson',
        'Williams',
        'Brown',
        'Jones',
        'Garcia',
        'Miller',
        'Davis',
      ],
      ORGANIZATION: [
        'Corp',
        'Inc',
        'LLC',
        'Holdings',
        'Trust',
        'Group',
        'Partners',
        'Ventures',
      ],
      LOCATION: ['City', 'Town', 'District', 'Region', 'Zone', 'Sector'],
    };

    const prefix = this.rng.choice(prefixes[type] || ['Entity']);
    const suffix = this.rng.choice(suffixes[type] || ['']);

    return `${prefix} ${suffix}${index > 0 ? ` ${index}` : ''}`.trim();
  }

  /**
   * Generate attributes from distribution
   */
  private generateAttributes(
    attributes: Record<string, AttributeDistribution>,
  ): Record<string, any> {
    const result: Record<string, any> = {};

    for (const [key, dist] of Object.entries(attributes)) {
      result[key] = this.sampleDistribution(dist);
    }

    return result;
  }

  /**
   * Sample from distribution
   */
  private sampleDistribution(dist: AttributeDistribution): any {
    if (Array.isArray(dist)) {
      return this.rng.choice(dist);
    }

    if (typeof dist === 'object' && 'distribution' in dist) {
      switch (dist.distribution) {
        case 'normal':
          return Math.round(this.rng.nextNormal(dist.mean, dist.stddev));
        case 'lognormal':
          return Math.round(this.rng.nextLogNormal(dist.mean, dist.stddev));
        case 'uniform':
          return this.rng.nextFloat(dist.min, dist.max);
        case 'daterange':
          return this.rng
            .nextDate(new Date(dist.start), new Date(dist.end))
            .toISOString();
        default:
          return null;
      }
    }

    return dist;
  }

  /**
   * Generate relationships from template
   */
  private generateRelationships(entities: Entity[]): Relationship[] {
    const relationships: Relationship[] = [];
    const entityTypeMap = this.buildEntityTypeMap(entities);

    for (const relTemplate of this.template.relationships) {
      const fromEntities = entityTypeMap.get(relTemplate.from) || [];
      const toEntities = entityTypeMap.get(relTemplate.to) || [];

      for (const fromEntity of fromEntities) {
        for (const toEntity of toEntities) {
          // Skip self-loops
          if (fromEntity === toEntity) {
            continue;
          }

          // Apply probability
          if (!this.rng.chance(relTemplate.probability)) {
            continue;
          }

          const relationship: Relationship = {
            type: relTemplate.type,
            from: entities.indexOf(fromEntity),
            to: entities.indexOf(toEntity),
            properties: this.generateAttributes(relTemplate.attributes || {}),
          };

          relationships.push(relationship);
        }
      }
    }

    // Apply edge density constraint if specified
    const targetDensity = this.template.params.edgeDensity;
    if (targetDensity && relationships.length > 0) {
      const maxEdges = entities.length * (entities.length - 1) * targetDensity;
      if (relationships.length > maxEdges) {
        this.rng.shuffle(relationships);
        relationships.splice(Math.floor(maxEdges));
      }
    }

    return relationships;
  }

  /**
   * Build map of entity type to entities
   */
  private buildEntityTypeMap(entities: Entity[]): Map<string, Entity[]> {
    const map = new Map<string, Entity[]>();

    for (const entity of entities) {
      if (!map.has(entity.type)) {
        map.set(entity.type, []);
      }
      map.get(entity.type)!.push(entity);
    }

    return map;
  }

  /**
   * Generate signals/anomalies
   */
  private generateSignals(entities: Entity[]): Signal[] {
    const signals: Signal[] = [];

    if (!this.template.signals) {
      return signals;
    }

    for (const signalTemplate of this.template.signals) {
      const count = signalTemplate.count || 1;
      const probability = signalTemplate.probability || 1.0;

      for (let i = 0; i < count; i++) {
        if (!this.rng.chance(probability)) {
          continue;
        }

        const signal: Signal = {
          type: signalTemplate.type,
          description: this.generateSignalDescription(
            signalTemplate.type,
            signalTemplate.entities || [],
          ),
        };

        // Select random entities for this signal
        if (signalTemplate.entities && signalTemplate.entities.length > 0) {
          const selectedCount = this.rng.nextInt(1, 4);
          const indices: number[] = [];
          for (let j = 0; j < selectedCount; j++) {
            indices.push(this.rng.nextInt(0, entities.length));
          }
          signal.entityIndices = indices;
        }

        signals.push(signal);
      }
    }

    return signals;
  }

  /**
   * Generate signal description
   */
  private generateSignalDescription(type: string, entities: string[]): string {
    switch (type) {
      case 'anomaly':
        return `Anomalous pattern detected involving ${entities.join(', ')}`;
      case 'missing_data':
        return 'Incomplete data records requiring investigation';
      case 'conflicting_evidence':
        return 'Conflicting information sources detected';
      default:
        return `Signal of type ${type}`;
    }
  }

  /**
   * Compute expected outcomes for validation
   */
  private computeExpectedOutcomes(
    entities: Entity[],
    relationships: Relationship[],
    signals: Signal[],
  ): ExpectedOutcomes {
    // Identify critical entities (high risk, many connections)
    const connectionCounts = new Map<number, number>();
    for (const rel of relationships) {
      const fromIdx = typeof rel.from === 'number' ? rel.from : 0;
      const toIdx = typeof rel.to === 'number' ? rel.to : 0;
      connectionCounts.set(fromIdx, (connectionCounts.get(fromIdx) || 0) + 1);
      connectionCounts.set(toIdx, (connectionCounts.get(toIdx) || 0) + 1);
    }

    const criticalEntities: string[] = [];
    for (const [idx, count] of connectionCounts.entries()) {
      if (count >= 3) {
        // Entities with 3+ connections
        criticalEntities.push(entities[idx].name);
      }
    }

    // Key relationships (high value, multiple hops)
    const keyRelationships = relationships
      .slice(0, Math.min(5, relationships.length))
      .map((rel) => rel.type);

    // Anomalies from signals
    const anomalies = signals.map((s) => s.description);

    return {
      criticalEntities,
      keyRelationships,
      anomalies,
      minEntitiesFound: Math.floor(entities.length * 0.8), // 80% discovery rate
      minRelationshipsFound: Math.floor(relationships.length * 0.7), // 70% discovery rate
    };
  }

  /**
   * Load template by name
   */
  private loadTemplate(name: string): ScenarioTemplate {
    // In real implementation, load from file system
    // For now, return built-in templates
    const templates = getBuiltInTemplates();
    const template = templates.find((t) => t.name === name);

    if (!template) {
      throw new Error(`Unknown template: ${name}`);
    }

    return template;
  }
}

/**
 * Built-in scenario templates
 */
export function getBuiltInTemplates(): ScenarioTemplate[] {
  return [
    {
      name: 'fraud-ring',
      type: 'financial-crime',
      description: 'Financial fraud network with shell companies',
      params: {
        nodeCount: 50,
        edgeDensity: 0.3,
        noiseLevel: 0.1,
        seed: 42,
      },
      entities: [
        {
          type: 'PERSON',
          distribution: {
            count: 20,
            attributes: {
              role: ['analyst', 'executive', 'intermediary', 'facilitator'],
              risk_score: { distribution: 'normal', mean: 60, stddev: 15 },
            },
          },
        },
        {
          type: 'ORGANIZATION',
          distribution: {
            count: 20,
            attributes: {
              sector: ['finance', 'tech', 'shell', 'consulting'],
              risk_score: { distribution: 'normal', mean: 70, stddev: 20 },
            },
          },
        },
        {
          type: 'LOCATION',
          distribution: {
            count: 10,
            attributes: {
              country: ['USA', 'Cayman Islands', 'Switzerland', 'Singapore'],
            },
          },
        },
      ],
      relationships: [
        {
          type: 'OWNS',
          from: 'PERSON',
          to: 'ORGANIZATION',
          probability: 0.3,
          attributes: {
            stake: { distribution: 'uniform', min: 10, max: 100 },
            since: { distribution: 'daterange', start: '2020-01-01', end: '2024-12-31' },
          },
        },
        {
          type: 'TRANSACTS_WITH',
          from: 'ORGANIZATION',
          to: 'ORGANIZATION',
          probability: 0.4,
          attributes: {
            amount: { distribution: 'lognormal', mean: 11.5, stddev: 1.0 },
            timestamp: { distribution: 'daterange', start: '2024-01-01', end: '2024-12-31' },
          },
        },
        {
          type: 'LOCATED_IN',
          from: 'ORGANIZATION',
          to: 'LOCATION',
          probability: 0.5,
        },
      ],
      signals: [
        {
          type: 'anomaly',
          entities: ['suspicious-transaction-pattern'],
          count: 5,
        },
        {
          type: 'missing_data',
          probability: 0.1,
        },
      ],
    },
    {
      name: 'terror-cell',
      type: 'security-threat',
      description: 'Terror network with communication patterns',
      params: {
        nodeCount: 30,
        edgeDensity: 0.25,
        noiseLevel: 0.15,
        seed: 123,
      },
      entities: [
        {
          type: 'PERSON',
          distribution: {
            count: 20,
            attributes: {
              role: ['leader', 'operative', 'courier', 'financier'],
              threat_level: { distribution: 'normal', mean: 70, stddev: 20 },
            },
          },
        },
        {
          type: 'LOCATION',
          distribution: {
            count: 10,
            attributes: {
              type: ['safe_house', 'meeting_point', 'border_crossing'],
            },
          },
        },
      ],
      relationships: [
        {
          type: 'COMMUNICATES_WITH',
          from: 'PERSON',
          to: 'PERSON',
          probability: 0.3,
          attributes: {
            frequency: { distribution: 'uniform', min: 1, max: 10 },
            last_contact: { distribution: 'daterange', start: '2024-01-01', end: '2024-12-31' },
          },
        },
        {
          type: 'VISITS',
          from: 'PERSON',
          to: 'LOCATION',
          probability: 0.4,
        },
      ],
      signals: [
        {
          type: 'anomaly',
          entities: ['communication-spike'],
          count: 3,
        },
      ],
    },
  ];
}
