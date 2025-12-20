import { BehavioralFingerprintService } from './BehavioralFingerprintService.js';
import { default as pino } from 'pino';

// @ts-ignore
const logger: any = pino();

export interface ERRuleConfig {
  latencyBudgetMs: number;
  similarityThreshold: number;
}

export interface EntityResolutionConfig {
  strategies: string[];
  privacy: {
    saltedHash: boolean;
    salt?: string;
  };
  thresholds: {
    match: number;
    possible: number;
  };
}

export interface NormalizedProperties {
  [key: string]: any;
}

const DEFAULT_CONFIG: EntityResolutionConfig = {
  strategies: ['exact'],
  privacy: {
    saltedHash: false,
    salt: process.env.ER_PRIVACY_SALT,
  },
  thresholds: {
    match: 0.9,
    possible: 0.75,
  },
};

export class EntityResolutionService {
  private behavioralService = new BehavioralFingerprintService();
  private config: EntityResolutionConfig;
  private ruleConfigs: Map<string, ERRuleConfig> = new Map([
    ['basic', { latencyBudgetMs: 100, similarityThreshold: 0.9 }],
    ['fuzzy', { latencyBudgetMs: 500, similarityThreshold: 0.85 }],
  ]);

  constructor(config: Partial<EntityResolutionConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };

    if (this.config.privacy.saltedHash && !this.config.privacy.salt) {
      throw new Error('EntityResolutionService: Salt must be provided when saltedHash privacy mode is enabled.');
    }
  }

  public normalizeEntityProperties(entity: any): NormalizedProperties {
    const normalized: NormalizedProperties = {};
    if (entity.name) {
      normalized.name = String(entity.name).trim().toLowerCase();
    }
    if (entity.email) {
      normalized.email = String(entity.email).trim().toLowerCase();
    }
    return normalized;
  }

  public async evaluateMatch(entityA: any, entityB: any): Promise<number> {
    const normA = this.normalizeEntityProperties(entityA);
    const normB = this.normalizeEntityProperties(entityB);

    let score = 0;
    if (normA.email && normA.email === normB.email) {
      score = 1.0;
    } else if (normA.name && normA.name === normB.name) {
      score = 0.8;
    }

    return score;
  }
}
