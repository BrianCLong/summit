/**
 * Scenario Generator
 * Generates synthetic graph/case data for various investigation scenarios
 */

import { v4 as uuidv4 } from 'uuid';
import {
  ScenarioData,
  ScenarioParameters,
  Entity,
  Relationship,
  EntityType,
  RelationshipType,
  GRAPH_SIZE_CONFIGS,
  GraphSize,
  ScenarioType,
} from '../types/index.js';

/**
 * Seeded random number generator for deterministic scenarios
 */
class SeededRandom {
  private seed: number;

  constructor(seed: number) {
    this.seed = seed % 2147483647;
    if (this.seed <= 0) this.seed += 2147483646;
  }

  next(): number {
    this.seed = (this.seed * 16807) % 2147483647;
    return (this.seed - 1) / 2147483646;
  }

  nextInt(min: number, max: number): number {
    return Math.floor(this.next() * (max - min + 1)) + min;
  }

  choice<T>(array: T[]): T {
    return array[Math.floor(this.next() * array.length)];
  }

  sample<T>(array: T[], count: number): T[] {
    const shuffled = [...array].sort(() => this.next() - 0.5);
    return shuffled.slice(0, Math.min(count, array.length));
  }
}

export class ScenarioGenerator {
  private rng: SeededRandom;
  private seed: number;

  constructor(seed?: number) {
    this.seed = seed || Date.now();
    this.rng = new SeededRandom(this.seed);
  }

  /**
   * Generate a scenario based on type and parameters
   */
  async generate(params: ScenarioParameters): Promise<ScenarioData> {
    // Reset RNG with seed for deterministic generation
    if (params.seed !== undefined) {
      this.seed = params.seed;
      this.rng = new SeededRandom(this.seed);
    }

    const config = GRAPH_SIZE_CONFIGS[params.size];

    switch (params.type) {
      case 'fraud-ring':
        return this.generateFraudRing(params, config);
      case 'terror-cell':
        return this.generateTerrorCell(params, config);
      case 'corruption-network':
        return this.generateCorruptionNetwork(params, config);
      case 'supply-chain':
        return this.generateSupplyChain(params, config);
      case 'money-laundering':
        return this.generateMoneyLaundering(params, config);
      case 'custom':
        return this.generateCustom(params, config);
      default:
        throw new Error(`Unknown scenario type: ${params.type}`);
    }
  }

  /**
   * Generate fraud ring scenario
   * Models financial fraud networks with shell companies and money flows
   */
  private async generateFraudRing(
    params: ScenarioParameters,
    config: any
  ): Promise<ScenarioData> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Create key actors (20% of entities)
    const keyActorCount = Math.floor(config.entities * 0.2);
    for (let i = 0; i < keyActorCount; i++) {
      entities.push({
        type: 'PERSON',
        name: this.generatePersonName(),
        properties: {
          role: this.rng.choice([
            'ringleader',
            'facilitator',
            'money_mule',
            'recruiter',
          ]),
          risk_score: this.rng.nextInt(60, 95),
          known_aliases: this.rng.nextInt(0, 3),
        },
      });
    }

    // Create shell companies (30% of entities)
    const companyCount = Math.floor(config.entities * 0.3);
    for (let i = 0; i < companyCount; i++) {
      entities.push({
        type: 'ORGANIZATION',
        name: this.generateCompanyName(),
        properties: {
          type: 'shell_company',
          jurisdiction: this.rng.choice([
            'Cayman Islands',
            'BVI',
            'Panama',
            'Delaware',
          ]),
          registration_date: this.generateDate(params.temporalSpan),
          suspicious_activity_score: this.rng.nextInt(50, 90),
        },
      });
    }

    // Create bank accounts (30% of entities)
    const accountCount = Math.floor(config.entities * 0.3);
    for (let i = 0; i < accountCount; i++) {
      entities.push({
        type: 'ACCOUNT',
        name: `Account-${uuidv4().substring(0, 8)}`,
        properties: {
          account_number: this.generateAccountNumber(),
          bank: this.generateBankName(),
          balance: this.rng.nextInt(10000, 5000000),
          transaction_count: this.rng.nextInt(50, 500),
        },
      });
    }

    // Fill remaining with locations and documents
    const remaining = config.entities - entities.length;
    for (let i = 0; i < remaining; i++) {
      if (this.rng.next() < 0.6) {
        entities.push({
          type: 'LOCATION',
          name: this.generateCityName(),
          properties: {
            country: this.generateCountryName(),
            risk_level: this.rng.choice(['low', 'medium', 'high']),
          },
        });
      } else {
        entities.push({
          type: 'DOCUMENT',
          name: `Document-${i}`,
          properties: {
            doc_type: this.rng.choice([
              'contract',
              'invoice',
              'transfer',
              'email',
            ]),
            date: this.generateDate(params.temporalSpan),
          },
        });
      }
    }

    // Generate relationships based on fraud patterns
    relationships.push(...this.generateFraudRelationships(entities, config));

    // Apply noise
    this.applyNoise(entities, relationships, params);

    return {
      investigation: {
        name: 'Fraud Ring Investigation',
        description:
          'Investigation of suspected financial fraud network involving shell companies and international money transfers',
        type: 'FRAUD_INVESTIGATION',
      },
      entities,
      relationships,
      copilotGoal:
        'Identify the key actors in the fraud network, trace money flows, and establish connections between shell companies',
      metadata: {
        seed: this.seed,
        generatedAt: new Date().toISOString(),
        parameters: params,
      },
    };
  }

  /**
   * Generate terror cell scenario
   */
  private async generateTerrorCell(
    params: ScenarioParameters,
    config: any
  ): Promise<ScenarioData> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Key operatives (15% of entities)
    const operativeCount = Math.floor(config.entities * 0.15);
    for (let i = 0; i < operativeCount; i++) {
      entities.push({
        type: 'PERSON',
        name: this.generatePersonName(),
        properties: {
          role: this.rng.choice([
            'cell_leader',
            'operative',
            'recruiter',
            'financier',
          ]),
          radicalization_date: this.generateDate(params.temporalSpan),
          threat_level: this.rng.choice(['high', 'critical']),
          known_movements: this.rng.nextInt(2, 10),
        },
      });
    }

    // Support network (25% of entities)
    const supportCount = Math.floor(config.entities * 0.25);
    for (let i = 0; i < supportCount; i++) {
      entities.push({
        type: 'PERSON',
        name: this.generatePersonName(),
        properties: {
          role: this.rng.choice(['supporter', 'courier', 'contact']),
          involvement_level: this.rng.choice(['suspected', 'confirmed']),
          surveillance_status: this.rng.choice(['active', 'inactive', 'pending']),
        },
      });
    }

    // Locations (30% of entities)
    const locationCount = Math.floor(config.entities * 0.3);
    for (let i = 0; i < locationCount; i++) {
      entities.push({
        type: 'LOCATION',
        name: this.generateCityName(),
        properties: {
          country: this.generateCountryName(),
          location_type: this.rng.choice([
            'safe_house',
            'meeting_point',
            'training_site',
            'residence',
          ]),
          last_activity: this.generateDate(params.temporalSpan),
        },
      });
    }

    // Communication events and documents
    const remaining = config.entities - entities.length;
    for (let i = 0; i < remaining; i++) {
      if (this.rng.next() < 0.5) {
        entities.push({
          type: 'EVENT',
          name: `Event-${i}`,
          properties: {
            event_type: this.rng.choice([
              'meeting',
              'communication',
              'transaction',
              'travel',
            ]),
            date: this.generateDate(params.temporalSpan),
            confidence: this.rng.next(),
          },
        });
      } else {
        entities.push({
          type: 'DOCUMENT',
          name: `Intelligence-${i}`,
          properties: {
            source: this.rng.choice(['sigint', 'humint', 'osint', 'imint']),
            classification: this.rng.choice(['confidential', 'secret', 'top_secret']),
            date: this.generateDate(params.temporalSpan),
          },
        });
      }
    }

    relationships.push(...this.generateTerrorRelationships(entities, config));
    this.applyNoise(entities, relationships, params);

    return {
      investigation: {
        name: 'Terror Cell Analysis',
        description:
          'Network analysis of suspected terror cell with focus on command structure and operational planning',
        type: 'THREAT_ANALYSIS',
      },
      entities,
      relationships,
      copilotGoal:
        'Map the organizational structure of the cell, identify the leadership, and predict potential targets or timelines',
      metadata: {
        seed: this.seed,
        generatedAt: new Date().toISOString(),
        parameters: params,
      },
    };
  }

  /**
   * Generate corruption network scenario
   */
  private async generateCorruptionNetwork(
    params: ScenarioParameters,
    config: any
  ): Promise<ScenarioData> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Government officials (20% of entities)
    const officialCount = Math.floor(config.entities * 0.2);
    for (let i = 0; i < officialCount; i++) {
      entities.push({
        type: 'PERSON',
        name: this.generatePersonName(),
        properties: {
          role: 'government_official',
          position: this.rng.choice([
            'minister',
            'director',
            'procurement_officer',
            'regulator',
          ]),
          tenure_start: this.generateDate(params.temporalSpan),
          influence_score: this.rng.nextInt(40, 95),
        },
      });
    }

    // Business entities (30% of entities)
    const businessCount = Math.floor(config.entities * 0.3);
    for (let i = 0; i < businessCount; i++) {
      entities.push({
        type: 'ORGANIZATION',
        name: this.generateCompanyName(),
        properties: {
          sector: this.rng.choice([
            'construction',
            'defense',
            'energy',
            'telecom',
          ]),
          government_contracts_value: this.rng.nextInt(1000000, 100000000),
          beneficial_owners_hidden: this.rng.next() > 0.5,
        },
      });
    }

    // Intermediaries and family members (20% of entities)
    const intermediaryCount = Math.floor(config.entities * 0.2);
    for (let i = 0; i < intermediaryCount; i++) {
      entities.push({
        type: 'PERSON',
        name: this.generatePersonName(),
        properties: {
          role: this.rng.choice([
            'family_member',
            'business_partner',
            'fixer',
            'lobbyist',
          ]),
          connections: this.rng.nextInt(3, 15),
        },
      });
    }

    // Remaining: documents, accounts, events
    const remaining = config.entities - entities.length;
    for (let i = 0; i < remaining; i++) {
      const rand = this.rng.next();
      if (rand < 0.4) {
        entities.push({
          type: 'DOCUMENT',
          name: `Evidence-${i}`,
          properties: {
            doc_type: this.rng.choice([
              'contract',
              'bank_statement',
              'email',
              'whistleblower_report',
            ]),
            date: this.generateDate(params.temporalSpan),
            authenticity: this.rng.choice(['verified', 'suspected', 'contested']),
          },
        });
      } else if (rand < 0.7) {
        entities.push({
          type: 'ACCOUNT',
          name: `Account-${uuidv4().substring(0, 8)}`,
          properties: {
            account_type: this.rng.choice(['offshore', 'domestic', 'shell']),
            suspicious_transfers: this.rng.nextInt(5, 50),
          },
        });
      } else {
        entities.push({
          type: 'EVENT',
          name: `Transaction-${i}`,
          properties: {
            event_type: 'financial_transaction',
            amount: this.rng.nextInt(50000, 5000000),
            date: this.generateDate(params.temporalSpan),
          },
        });
      }
    }

    relationships.push(
      ...this.generateCorruptionRelationships(entities, config)
    );
    this.applyNoise(entities, relationships, params);

    return {
      investigation: {
        name: 'Corruption Network Investigation',
        description:
          'Investigation of alleged corruption involving government officials, contractors, and kickback schemes',
        type: 'CORRUPTION_INVESTIGATION',
      },
      entities,
      relationships,
      copilotGoal:
        'Trace money flows from government contracts to officials, identify beneficial ownership structures, and establish quid pro quo relationships',
      metadata: {
        seed: this.seed,
        generatedAt: new Date().toISOString(),
        parameters: params,
      },
    };
  }

  /**
   * Generate supply chain scenario
   */
  private async generateSupplyChain(
    params: ScenarioParameters,
    config: any
  ): Promise<ScenarioData> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Generate multi-tier supply chain
    const tiers = 4;
    const entitiesPerTier = Math.floor(config.entities / tiers);

    for (let tier = 0; tier < tiers; tier++) {
      for (let i = 0; i < entitiesPerTier; i++) {
        entities.push({
          type: 'ORGANIZATION',
          name: this.generateCompanyName(),
          properties: {
            tier: tier + 1,
            type: this.rng.choice([
              'manufacturer',
              'distributor',
              'supplier',
              'logistics',
            ]),
            certification: this.rng.choice(['ISO9001', 'None', 'Pending']),
            risk_score: this.rng.nextInt(20, 80),
          },
        });
      }
    }

    // Add some locations
    for (let i = entities.length; i < config.entities; i++) {
      entities.push({
        type: 'LOCATION',
        name: this.generateCityName(),
        properties: {
          country: this.generateCountryName(),
          facility_type: this.rng.choice([
            'factory',
            'warehouse',
            'port',
            'distribution_center',
          ]),
        },
      });
    }

    relationships.push(...this.generateSupplyChainRelationships(entities, config));
    this.applyNoise(entities, relationships, params);

    return {
      investigation: {
        name: 'Supply Chain Analysis',
        description:
          'Analysis of complex multi-tier supply chain for risk assessment and optimization',
        type: 'NETWORK_ANALYSIS',
      },
      entities,
      relationships,
      copilotGoal:
        'Map the complete supply chain, identify bottlenecks and single points of failure, assess supplier risks',
      metadata: {
        seed: this.seed,
        generatedAt: new Date().toISOString(),
        parameters: params,
      },
    };
  }

  /**
   * Generate money laundering scenario
   */
  private async generateMoneyLaundering(
    params: ScenarioParameters,
    config: any
  ): Promise<ScenarioData> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    // Create layered structure typical of money laundering
    // Placement layer
    const placementCount = Math.floor(config.entities * 0.25);
    for (let i = 0; i < placementCount; i++) {
      entities.push({
        type: 'ACCOUNT',
        name: `Account-${uuidv4().substring(0, 8)}`,
        properties: {
          stage: 'placement',
          bank: this.generateBankName(),
          jurisdiction: this.generateCountryName(),
          smurfing_indicator: this.rng.next() > 0.7,
        },
      });
    }

    // Layering entities (shell companies, etc.)
    const layeringCount = Math.floor(config.entities * 0.35);
    for (let i = 0; i < layeringCount; i++) {
      if (this.rng.next() < 0.6) {
        entities.push({
          type: 'ORGANIZATION',
          name: this.generateCompanyName(),
          properties: {
            stage: 'layering',
            type: 'shell_company',
            transaction_volume: this.rng.nextInt(100000, 10000000),
          },
        });
      } else {
        entities.push({
          type: 'ACCOUNT',
          name: `Account-${uuidv4().substring(0, 8)}`,
          properties: {
            stage: 'layering',
            complexity_score: this.rng.nextInt(50, 95),
          },
        });
      }
    }

    // Integration layer and individuals
    const remaining = config.entities - entities.length;
    for (let i = 0; i < remaining; i++) {
      if (this.rng.next() < 0.4) {
        entities.push({
          type: 'PERSON',
          name: this.generatePersonName(),
          properties: {
            role: this.rng.choice([
              'beneficial_owner',
              'nominee',
              'money_mule',
            ]),
            pep_status: this.rng.next() > 0.8,
          },
        });
      } else {
        entities.push({
          type: 'ASSET',
          name: `Asset-${i}`,
          properties: {
            asset_type: this.rng.choice([
              'real_estate',
              'luxury_goods',
              'art',
              'vehicle',
            ]),
            value: this.rng.nextInt(100000, 5000000),
            stage: 'integration',
          },
        });
      }
    }

    relationships.push(
      ...this.generateMoneyLaunderingRelationships(entities, config)
    );
    this.applyNoise(entities, relationships, params);

    return {
      investigation: {
        name: 'Money Laundering Network',
        description:
          'Investigation of suspected money laundering operation across multiple jurisdictions',
        type: 'FRAUD_INVESTIGATION',
      },
      entities,
      relationships,
      copilotGoal:
        'Trace the flow of funds through placement, layering, and integration stages, identify beneficial owners',
      metadata: {
        seed: this.seed,
        generatedAt: new Date().toISOString(),
        parameters: params,
      },
    };
  }

  /**
   * Generate custom scenario based on parameters
   */
  private async generateCustom(
    params: ScenarioParameters,
    config: any
  ): Promise<ScenarioData> {
    const entities: Entity[] = [];
    const relationships: Relationship[] = [];

    const entityTypes: EntityType[] = [
      'PERSON',
      'ORGANIZATION',
      'LOCATION',
      'EVENT',
      'DOCUMENT',
      'ASSET',
      'ACCOUNT',
    ];

    // Generate diverse entity mix
    for (let i = 0; i < config.entities; i++) {
      const type = this.rng.choice(entityTypes);
      entities.push({
        type,
        name: this.generateEntityName(type, i),
        properties: {
          custom: true,
          index: i,
          ...this.generateCustomProperties(type),
        },
      });
    }

    // Generate relationships based on density
    const relationshipCount = Math.floor(
      config.entities * config.relationshipDensity
    );
    for (let i = 0; i < relationshipCount; i++) {
      const from = this.rng.nextInt(0, entities.length - 1);
      let to = this.rng.nextInt(0, entities.length - 1);
      while (to === from) {
        to = this.rng.nextInt(0, entities.length - 1);
      }

      relationships.push({
        type: this.rng.choice([
          'AFFILIATED_WITH',
          'TRANSACTED_WITH',
          'RELATED_TO',
          'COMMUNICATES_WITH',
        ] as RelationshipType[]),
        from,
        to,
        properties: {
          strength: this.rng.next(),
          date: this.generateDate(params.temporalSpan),
        },
      });
    }

    this.applyNoise(entities, relationships, params);

    return {
      investigation: {
        name: params.customParams?.name || 'Custom Investigation',
        description:
          params.customParams?.description || 'Custom generated scenario',
        type: 'INTELLIGENCE_ANALYSIS',
      },
      entities,
      relationships,
      copilotGoal:
        params.customParams?.copilotGoal || 'Analyze the network and identify key patterns',
      metadata: {
        seed: this.seed,
        generatedAt: new Date().toISOString(),
        parameters: params,
      },
    };
  }

  // ==================== Relationship Generators ====================

  private generateFraudRelationships(
    entities: Entity[],
    config: any
  ): Relationship[] {
    const relationships: Relationship[] = [];

    // Find entities by type
    const people = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.type === 'PERSON');
    const orgs = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.type === 'ORGANIZATION');
    const accounts = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.type === 'ACCOUNT');

    // Connect people to organizations (CONTROLS, OWNS)
    for (const person of people) {
      const numOrgs = this.rng.nextInt(1, 3);
      const targetOrgs = this.rng.sample(orgs, numOrgs);
      for (const org of targetOrgs) {
        relationships.push({
          type: this.rng.choice(['CONTROLS', 'OWNS'] as RelationshipType[]),
          from: person.index,
          to: org.index,
          properties: {
            since: this.generateDate(),
            hidden: this.rng.next() > 0.7,
          },
        });
      }
    }

    // Connect organizations to accounts (OWNS)
    for (const org of orgs) {
      const numAccounts = this.rng.nextInt(1, 4);
      const targetAccounts = this.rng.sample(accounts, numAccounts);
      for (const account of targetAccounts) {
        relationships.push({
          type: 'OWNS',
          from: org.index,
          to: account.index,
          properties: {
            opened: this.generateDate(),
          },
        });
      }
    }

    // Connect accounts to accounts (TRANSACTED_WITH)
    const transactionCount = Math.floor(accounts.length * 1.5);
    for (let i = 0; i < transactionCount; i++) {
      const from = this.rng.choice(accounts);
      const to = this.rng.choice(accounts.filter((a) => a.index !== from.index));
      if (to) {
        relationships.push({
          type: 'TRANSACTED_WITH',
          from: from.index,
          to: to.index,
          properties: {
            amount: this.rng.nextInt(10000, 1000000),
            date: this.generateDate(),
            suspicious: this.rng.next() > 0.6,
          },
        });
      }
    }

    return relationships;
  }

  private generateTerrorRelationships(
    entities: Entity[],
    config: any
  ): Relationship[] {
    const relationships: Relationship[] = [];

    const people = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.type === 'PERSON');
    const locations = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.type === 'LOCATION');

    // Create hierarchical structure
    if (people.length > 0) {
      const leaders = people.filter(
        (p) => p.entity.properties.role === 'cell_leader'
      );
      const operatives = people.filter(
        (p) => p.entity.properties.role === 'operative'
      );
      const supporters = people.filter(
        (p) => p.entity.properties.role === 'supporter'
      );

      // Leaders to operatives
      for (const leader of leaders) {
        const numOperatives = this.rng.nextInt(2, 5);
        const targets = this.rng.sample(operatives, numOperatives);
        for (const operative of targets) {
          relationships.push({
            type: 'CONTROLS',
            from: leader.index,
            to: operative.index,
            properties: {
              since: this.generateDate(),
              communication_frequency: this.rng.choice(['daily', 'weekly', 'sporadic']),
            },
          });
        }
      }

      // Operatives to supporters
      for (const operative of operatives) {
        const numSupporters = this.rng.nextInt(1, 3);
        const targets = this.rng.sample(supporters, numSupporters);
        for (const supporter of targets) {
          relationships.push({
            type: 'COMMUNICATES_WITH',
            from: operative.index,
            to: supporter.index,
            properties: {
              method: this.rng.choice(['encrypted_app', 'in_person', 'courier']),
            },
          });
        }
      }

      // People to locations
      for (const person of people) {
        const numLocations = this.rng.nextInt(1, 3);
        const targets = this.rng.sample(locations, numLocations);
        for (const location of targets) {
          relationships.push({
            type: 'LOCATED_IN',
            from: person.index,
            to: location.index,
            properties: {
              frequency: this.rng.choice(['regular', 'occasional', 'one_time']),
              last_seen: this.generateDate(),
            },
          });
        }
      }
    }

    return relationships;
  }

  private generateCorruptionRelationships(
    entities: Entity[],
    config: any
  ): Relationship[] {
    const relationships: Relationship[] = [];

    const officials = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter(
        (e) =>
          e.entity.type === 'PERSON' &&
          e.entity.properties.role === 'government_official'
      );
    const businesses = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.type === 'ORGANIZATION');
    const intermediaries = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter(
        (e) =>
          e.entity.type === 'PERSON' &&
          e.entity.properties.role !== 'government_official'
      );

    // Officials to businesses (direct and indirect)
    for (const official of officials) {
      // Direct connections (fewer, more suspicious)
      if (this.rng.next() > 0.7) {
        const business = this.rng.choice(businesses);
        relationships.push({
          type: 'AFFILIATED_WITH',
          from: official.index,
          to: business.index,
          properties: {
            type: 'financial_interest',
            hidden: true,
            value: this.rng.nextInt(100000, 5000000),
          },
        });
      }

      // Indirect via intermediaries
      const numIntermediaries = this.rng.nextInt(1, 3);
      const targets = this.rng.sample(intermediaries, numIntermediaries);
      for (const intermediary of targets) {
        relationships.push({
          type: this.rng.choice(['AFFILIATED_WITH', 'RELATED_TO'] as RelationshipType[]),
          from: official.index,
          to: intermediary.index,
          properties: {
            relationship: this.rng.choice([
              'family',
              'business_partner',
              'associate',
            ]),
          },
        });

        // Intermediary to business
        if (this.rng.next() > 0.5) {
          const business = this.rng.choice(businesses);
          relationships.push({
            type: 'CONTROLS',
            from: intermediary.index,
            to: business.index,
            properties: {
              ownership_percentage: this.rng.nextInt(20, 100),
            },
          });
        }
      }
    }

    return relationships;
  }

  private generateSupplyChainRelationships(
    entities: Entity[],
    config: any
  ): Relationship[] {
    const relationships: Relationship[] = [];

    const companies = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.type === 'ORGANIZATION');

    // Group by tier
    const tierGroups = new Map<number, typeof companies>();
    for (const company of companies) {
      const tier = company.entity.properties.tier || 1;
      if (!tierGroups.has(tier)) {
        tierGroups.set(tier, []);
      }
      tierGroups.get(tier)!.push(company);
    }

    // Connect tiers in supply chain
    const tiers = Array.from(tierGroups.keys()).sort();
    for (let i = 0; i < tiers.length - 1; i++) {
      const currentTier = tierGroups.get(tiers[i])!;
      const nextTier = tierGroups.get(tiers[i + 1])!;

      for (const supplier of currentTier) {
        const numCustomers = this.rng.nextInt(1, 4);
        const customers = this.rng.sample(nextTier, numCustomers);
        for (const customer of customers) {
          relationships.push({
            type: 'TRANSACTED_WITH',
            from: supplier.index,
            to: customer.index,
            properties: {
              relationship_type: 'supplier',
              contract_value: this.rng.nextInt(50000, 5000000),
              since: this.generateDate(),
            },
          });
        }
      }
    }

    return relationships;
  }

  private generateMoneyLaunderingRelationships(
    entities: Entity[],
    config: any
  ): Relationship[] {
    const relationships: Relationship[] = [];

    // Group by stage
    const placement = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.properties.stage === 'placement');
    const layering = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.properties.stage === 'layering');
    const integration = entities
      .map((e, i) => ({ entity: e, index: i }))
      .filter((e) => e.entity.properties.stage === 'integration');

    // Placement to layering
    for (const source of placement) {
      const numTargets = this.rng.nextInt(2, 5);
      const targets = this.rng.sample(layering, numTargets);
      for (const target of targets) {
        relationships.push({
          type: 'TRANSACTED_WITH',
          from: source.index,
          to: target.index,
          properties: {
            amount: this.rng.nextInt(10000, 500000),
            stage: 'placement_to_layering',
            date: this.generateDate(),
          },
        });
      }
    }

    // Layering internal connections (complex web)
    const layeringConnections = Math.floor(layering.length * 2);
    for (let i = 0; i < layeringConnections; i++) {
      const from = this.rng.choice(layering);
      const to = this.rng.choice(layering.filter((e) => e.index !== from.index));
      if (to) {
        relationships.push({
          type: 'TRANSACTED_WITH',
          from: from.index,
          to: to.index,
          properties: {
            amount: this.rng.nextInt(50000, 2000000),
            stage: 'layering',
            complexity: this.rng.nextInt(1, 10),
          },
        });
      }
    }

    // Layering to integration
    for (const source of layering.slice(-Math.floor(layering.length * 0.4))) {
      const numTargets = this.rng.nextInt(1, 3);
      const targets = this.rng.sample(integration, numTargets);
      for (const target of targets) {
        relationships.push({
          type: this.rng.choice(['TRANSACTED_WITH', 'OWNS'] as RelationshipType[]),
          from: source.index,
          to: target.index,
          properties: {
            stage: 'layering_to_integration',
            date: this.generateDate(),
          },
        });
      }
    }

    return relationships;
  }

  // ==================== Noise and Data Quality ====================

  private applyNoise(
    entities: Entity[],
    relationships: Relationship[],
    params: ScenarioParameters
  ): void {
    // Apply missing data
    if (params.missingDataRate > 0) {
      for (const entity of entities) {
        if (this.rng.next() < params.missingDataRate) {
          // Remove some properties
          const keys = Object.keys(entity.properties);
          if (keys.length > 1) {
            const keyToRemove = this.rng.choice(keys);
            delete entity.properties[keyToRemove];
          }
        }
      }
    }

    // Apply conflicting evidence
    if (params.conflictingEvidenceRate > 0) {
      const conflictCount = Math.floor(
        entities.length * params.conflictingEvidenceRate
      );
      for (let i = 0; i < conflictCount; i++) {
        const entity = this.rng.choice(entities);
        entity.properties.conflicting_data = true;
        entity.properties.confidence = this.rng.next() * 0.5; // Low confidence
      }
    }

    // Apply general noise to properties
    if (params.noiseLevel > 0) {
      for (const entity of entities) {
        if (this.rng.next() < params.noiseLevel) {
          entity.properties.noise_flag = true;
          // Add random property
          entity.properties[`random_${this.rng.nextInt(1, 100)}`] =
            this.rng.next();
        }
      }
    }
  }

  // ==================== Helper Methods ====================

  private generatePersonName(): string {
    const firstNames = [
      'Alex',
      'Jordan',
      'Morgan',
      'Casey',
      'Riley',
      'Avery',
      'Quinn',
      'Reese',
      'Dakota',
      'Skyler',
    ];
    const lastNames = [
      'Smith',
      'Johnson',
      'Williams',
      'Brown',
      'Jones',
      'Garcia',
      'Miller',
      'Davis',
      'Rodriguez',
      'Martinez',
    ];
    return `${this.rng.choice(firstNames)} ${this.rng.choice(lastNames)}`;
  }

  private generateCompanyName(): string {
    const prefixes = [
      'Global',
      'International',
      'United',
      'Premier',
      'Elite',
      'Advanced',
    ];
    const suffixes = [
      'Corp',
      'LLC',
      'Industries',
      'Group',
      'Holdings',
      'Ventures',
    ];
    return `${this.rng.choice(prefixes)} ${this.rng.choice(suffixes)}`;
  }

  private generateCityName(): string {
    const cities = [
      'New York',
      'London',
      'Tokyo',
      'Dubai',
      'Singapore',
      'Hong Kong',
      'Zurich',
      'Geneva',
      'Luxembourg',
      'Monaco',
    ];
    return this.rng.choice(cities);
  }

  private generateCountryName(): string {
    const countries = [
      'USA',
      'UK',
      'Switzerland',
      'Singapore',
      'UAE',
      'Cayman Islands',
      'Panama',
      'Luxembourg',
      'Cyprus',
      'Malta',
    ];
    return this.rng.choice(countries);
  }

  private generateBankName(): string {
    const banks = [
      'Global Bank',
      'International Finance Corp',
      'Premier Trust',
      'Elite Banking Group',
      'United Capital',
      'Strategic Finance',
    ];
    return this.rng.choice(banks);
  }

  private generateAccountNumber(): string {
    return `ACC-${this.rng.nextInt(100000, 999999)}`;
  }

  private generateDate(temporalSpan?: { start: string; end: string }): string {
    if (temporalSpan) {
      const start = new Date(temporalSpan.start).getTime();
      const end = new Date(temporalSpan.end).getTime();
      const timestamp = start + this.rng.next() * (end - start);
      return new Date(timestamp).toISOString().split('T')[0];
    }

    // Default: random date within last 2 years
    const now = Date.now();
    const twoYears = 2 * 365 * 24 * 60 * 60 * 1000;
    const timestamp = now - this.rng.next() * twoYears;
    return new Date(timestamp).toISOString().split('T')[0];
  }

  private generateEntityName(type: EntityType, index: number): string {
    switch (type) {
      case 'PERSON':
        return this.generatePersonName();
      case 'ORGANIZATION':
        return this.generateCompanyName();
      case 'LOCATION':
        return this.generateCityName();
      case 'EVENT':
        return `Event-${index}`;
      case 'DOCUMENT':
        return `Document-${index}`;
      case 'ASSET':
        return `Asset-${index}`;
      case 'ACCOUNT':
        return `Account-${index}`;
      default:
        return `Entity-${index}`;
    }
  }

  private generateCustomProperties(type: EntityType): Record<string, any> {
    const baseProps = {
      generated: true,
      timestamp: new Date().toISOString(),
    };

    switch (type) {
      case 'PERSON':
        return {
          ...baseProps,
          age: this.rng.nextInt(20, 70),
          nationality: this.generateCountryName(),
        };
      case 'ORGANIZATION':
        return {
          ...baseProps,
          sector: this.rng.choice(['finance', 'tech', 'manufacturing', 'services']),
          employees: this.rng.nextInt(10, 10000),
        };
      case 'LOCATION':
        return {
          ...baseProps,
          country: this.generateCountryName(),
          coordinates: {
            lat: this.rng.next() * 180 - 90,
            lng: this.rng.next() * 360 - 180,
          },
        };
      default:
        return baseProps;
    }
  }
}
