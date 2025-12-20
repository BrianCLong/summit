/**
 * Safety guards to prevent harness from running against production
 */

export interface SafetyConfig {
  requireTestPrefix: boolean;
  blockProductionUrls: boolean;
  maxDataSize: number;
}

const PRODUCTION_URL_PATTERNS = [
  /prod\.intelgraph\.com/i,
  /production\.intelgraph\.com/i,
  /intelgraph\.com$/i,
  /\.mil$/i,
  /\.gov$/i,
];

const BLOCKED_ACTIONS = ['DELETE', 'TRUNCATE', 'DROP'];

export class SafetyGuard {
  constructor(private config: SafetyConfig) {}

  /**
   * Validate API URL is not production
   */
  validateApiUrl(url: string): void {
    if (!this.config.blockProductionUrls) {
      return;
    }

    for (const pattern of PRODUCTION_URL_PATTERNS) {
      if (pattern.test(url)) {
        throw new Error(
          `SAFETY: Harness cannot run against production URL: ${url}`,
        );
      }
    }

    // Additional safety: require localhost or test domains
    const urlObj = new URL(url);
    const hostname = urlObj.hostname.toLowerCase();

    if (
      !hostname.includes('localhost') &&
      !hostname.includes('127.0.0.1') &&
      !hostname.includes('test') &&
      !hostname.includes('dev') &&
      !hostname.includes('staging')
    ) {
      console.warn(
        `WARNING: Running harness against non-standard URL: ${url}`,
      );
      console.warn(
        'Expected localhost, test, dev, or staging in hostname. Proceeding with caution...',
      );
    }
  }

  /**
   * Validate tenant ID has test prefix
   */
  validateTenantId(tenantId: string): void {
    if (!this.config.requireTestPrefix) {
      return;
    }

    if (
      !tenantId.startsWith('test-') &&
      !tenantId.startsWith('sim-') &&
      !tenantId.startsWith('harness-')
    ) {
      throw new Error(
        `SAFETY: Tenant ID must start with 'test-', 'sim-', or 'harness-' prefix. Got: ${tenantId}`,
      );
    }
  }

  /**
   * Validate scenario size is within limits
   */
  validateDataSize(entityCount: number, relationshipCount: number): void {
    const totalSize = entityCount + relationshipCount;
    if (totalSize > this.config.maxDataSize) {
      throw new Error(
        `SAFETY: Scenario size (${totalSize}) exceeds maximum allowed (${this.config.maxDataSize})`,
      );
    }
  }

  /**
   * Validate query doesn't contain destructive operations
   */
  validateQuery(query: string): void {
    const upperQuery = query.toUpperCase();
    for (const action of BLOCKED_ACTIONS) {
      if (upperQuery.includes(action)) {
        throw new Error(
          `SAFETY: Query contains blocked action: ${action}. Harness only supports read and write operations, not destructive operations.`,
        );
      }
    }
  }

  /**
   * Tag entity with simulation marker
   */
  tagSimulationData(entity: any): any {
    return {
      ...entity,
      properties: {
        ...entity.properties,
        sim_harness: true,
        sim_harness_timestamp: new Date().toISOString(),
      },
    };
  }

  /**
   * Validate all safety checks
   */
  validateConfig(config: {
    apiUrl: string;
    tenantId: string;
    entityCount: number;
    relationshipCount: number;
  }): void {
    this.validateApiUrl(config.apiUrl);
    this.validateTenantId(config.tenantId);
    this.validateDataSize(config.entityCount, config.relationshipCount);
  }
}
