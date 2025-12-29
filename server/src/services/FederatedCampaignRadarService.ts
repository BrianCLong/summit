import { EventEmitter } from 'events';
import * as crypto from 'crypto';
import { logger } from '../utils/logger.js';

export interface CampaignSignal {
  type: 'CLAIM' | 'NARRATIVE' | 'MEDIA' | 'URL';
  value: string; // The raw content (will be hashed)
  timestamp?: Date;
  metadata: {
    source_platform?: string;
    coordination_score?: number;
    account_age_days?: number;
    c2pa_provenance?: any;
    [key: string]: any;
  };
}

export interface AnonymizedSignal {
  signal_hash: string; // SHA-256 of the value
  type: string;
  timestamp: Date;
  tenant_id: string; // The contributor
  features: {
    platform: string;
    coordination_score: number;
    has_provenance: boolean;
  };
}

export interface CampaignCluster {
  signal_hash: string;
  type: string;
  first_seen: Date;
  last_seen: Date;
  distinct_tenants: number; // Count of unique tenants reporting this
  total_signals: number;
  threat_level: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  contributing_tenants?: string[]; // Only for internal/authorized views
}

export class FederatedCampaignRadarService extends EventEmitter {
  private static instance: FederatedCampaignRadarService;
  private static CAPACITY = 10000; // Configurable bounded capacity

  // Circular buffer implementation
  private federatedSignals: AnonymizedSignal[];
  private writeIndex: number = 0;
  private count: number = 0;

  private logger = logger;

  private constructor() {
    super();
    this.federatedSignals = new Array(FederatedCampaignRadarService.CAPACITY);
  }

  public static getInstance(): FederatedCampaignRadarService {
    if (!FederatedCampaignRadarService.instance) {
      FederatedCampaignRadarService.instance = new FederatedCampaignRadarService();
    }
    return FederatedCampaignRadarService.instance;
  }

  /**
   * Submits a signal to the federated radar.
   * The signal is anonymized (hashed) before storage.
   */
  public async submitSignal(tenantId: string, signal: CampaignSignal): Promise<AnonymizedSignal> {
    const anonymized = this.anonymizeSignal(tenantId, signal);

    // Store in circular buffer
    this.federatedSignals[this.writeIndex] = anonymized;
    this.writeIndex = (this.writeIndex + 1) % FederatedCampaignRadarService.CAPACITY;
    if (this.count < FederatedCampaignRadarService.CAPACITY) {
      this.count++;
    }

    this.logger.info(`Received signal from tenant ${tenantId}`, { hash: anonymized.signal_hash });

    // Check for early warnings immediately
    await this.checkForEarlyWarnings(anonymized.signal_hash);

    return anonymized;
  }

  private anonymizeSignal(tenantId: string, signal: CampaignSignal): AnonymizedSignal {
    const hash = crypto.createHash('sha256').update(signal.value).digest('hex');

    return {
      signal_hash: hash,
      type: signal.type,
      timestamp: signal.timestamp ? new Date(signal.timestamp) : new Date(),
      tenant_id: tenantId,
      features: {
        platform: signal.metadata.source_platform || 'unknown',
        coordination_score: signal.metadata.coordination_score || 0,
        has_provenance: !!signal.metadata.c2pa_provenance
      }
    };
  }

  /**
   * Retrieves aggregated campaign clusters.
   * Logic: Group by signal hash and count distinct tenants.
   */
  public async getGlobalCampaigns(): Promise<CampaignCluster[]> {
    const groups = new Map<string, AnonymizedSignal[]>();

    // Iterate over the valid portion of the buffer
    // Since it's a circular buffer but we iterate all valid items,
    // we can just iterate 0 to count, handling the wrap-around logic is not needed for grouping
    // because order doesn't strictly matter for grouping, but if we wanted order we'd start from (writeIndex - count + capacity) % capacity.
    // However, the internal array holds valid references for indices 0 to count-1 ONLY IF buffer isn't full yet.
    // IF buffer IS full (count == CAPACITY), then valid indices are 0 to CAPACITY-1.
    // So simple iteration over the raw array is fine as long as we stop at `count` if not full,
    // or iterate the whole array if full.
    // BUT: If full, the writeIndex points to the *oldest* item (next to be overwritten),
    // and the newest item is at writeIndex - 1.
    // For grouping, simple iteration is sufficient.

    const limit = this.count;
    // Note: if count < capacity, valid items are at 0..count-1.
    // If count == capacity, valid items are at 0..capacity-1.
    // However, if we wrapped around, the array is full of valid items.
    // If not wrapped around (count < capacity), writeIndex == count.

    // So simple loop:
    for (let i = 0; i < limit; i++) {
        // If count < capacity, we iterate 0 to writeIndex-1 (which is correct).
        // If count == capacity, we iterate 0 to capacity-1 (which is correct).

        // Wait, if not full: writeIndex is 5. count is 5.
        // Array has items at 0,1,2,3,4.
        // Loop i=0 to 4. Correct.

        // If full: writeIndex can be anything. count is CAPACITY.
        // Array is full. Loop 0 to CAPACITY-1. Correct.
        // But what if we are midway through a second pass?
        // writeIndex is 5. count is CAPACITY.
        // We still want to iterate all CAPACITY items.
        // So yes, iterating 0 to this.count is correct because this.count caps at CAPACITY.

        const s = this.federatedSignals[i];
        const list = groups.get(s.signal_hash) || [];
        list.push(s);
        groups.set(s.signal_hash, list);
    }

    const clusters: CampaignCluster[] = [];

    for (const [hash, signals] of groups) {
      const tenants = new Set(signals.map(s => s.tenant_id));
      const firstSeen = signals.reduce((min, s) => s.timestamp < min ? s.timestamp : min, new Date());
      const lastSeen = signals.reduce((max, s) => s.timestamp > max ? s.timestamp : max, new Date(0));

      const distinctTenants = tenants.size;
      const totalSignals = signals.length;

      // Calculate threat level based on spread and velocity
      let threatLevel: 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' = 'LOW';
      if (distinctTenants > 5 || totalSignals > 100) threatLevel = 'CRITICAL';
      else if (distinctTenants > 2 || totalSignals > 20) threatLevel = 'HIGH';
      else if (distinctTenants > 1) threatLevel = 'MEDIUM';

      clusters.push({
        signal_hash: hash,
        type: signals[0].type,
        first_seen: firstSeen,
        last_seen: lastSeen,
        distinct_tenants: distinctTenants,
        total_signals: totalSignals,
        threat_level: threatLevel,
        // contributing_tenants: Array.from(tenants) // Masked for privacy
      });
    }

    // Sort by distinct tenants (descending)
    return clusters.sort((a, b) => b.distinct_tenants - a.distinct_tenants);
  }

  private async checkForEarlyWarnings(hash: string) {
    const campaigns = await this.getGlobalCampaigns();
    const campaign = campaigns.find(c => c.signal_hash === hash);

    if (campaign) {
        // If > 2 tenants are seeing this, it's a cross-tenant coordination event
        if (campaign.distinct_tenants > 2 || (campaign.distinct_tenants > 1 && campaign.threat_level === 'HIGH')) {
            this.emit('campaign-alert', campaign);
            this.logger.warn(`Early Warning: Campaign ${hash} reached ${campaign.threat_level} threat level across ${campaign.distinct_tenants} tenants.`);
            // TODO: Trigger "response pack" generation
        }
    }
  }

  // Reset for testing
  public _resetForTesting() {
    this.federatedSignals = new Array(FederatedCampaignRadarService.CAPACITY);
    this.writeIndex = 0;
    this.count = 0;
  }

  // Setter for testing capacity
  public static _setCapacityForTesting(cap: number) {
      FederatedCampaignRadarService.CAPACITY = cap;
  }
}
