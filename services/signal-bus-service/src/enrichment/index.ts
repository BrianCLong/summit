/**
 * Enrichment Pipeline
 *
 * Orchestrates multiple enrichers to enhance signal data.
 *
 * @module enrichment
 */

import type { SignalEnvelope } from '@intelgraph/signal-contracts';
import type { Logger } from 'pino';

import type { EnrichmentResult, StateStore } from '../types.js';

import { createDeviceEnricher, type DeviceEnricherService } from './device-enricher.js';
import { createGeoIpEnricher, type GeoIpEnricherService } from './geoip-enricher.js';

export { createGeoIpEnricher, GeoIpEnricherService } from './geoip-enricher.js';
export { createDeviceEnricher, DeviceEnricherService } from './device-enricher.js';

/**
 * Enrichment pipeline configuration
 */
export interface EnrichmentPipelineConfig {
  /** Enable GeoIP enrichment */
  geoIpEnabled: boolean;
  /** Enable device lookup enrichment */
  deviceLookupEnabled: boolean;
  /** Timeout for enrichment operations in milliseconds */
  timeoutMs: number;
  /** Continue on enrichment errors */
  continueOnError: boolean;
}

/**
 * Default configuration
 */
const defaultConfig: EnrichmentPipelineConfig = {
  geoIpEnabled: true,
  deviceLookupEnabled: true,
  timeoutMs: 5000,
  continueOnError: true,
};

/**
 * Enrichment Pipeline class
 */
export class EnrichmentPipeline {
  private config: EnrichmentPipelineConfig;
  private logger: Logger;
  private geoIpEnricher?: GeoIpEnricherService;
  private deviceEnricher?: DeviceEnricherService;
  private stats = {
    total: 0,
    successful: 0,
    partial: 0,
    failed: 0,
  };

  constructor(
    logger: Logger,
    config?: Partial<EnrichmentPipelineConfig>,
    stateStore?: StateStore,
  ) {
    this.logger = logger.child({ component: 'enrichment-pipeline' });
    this.config = { ...defaultConfig, ...config };

    if (this.config.geoIpEnabled) {
      this.geoIpEnricher = createGeoIpEnricher(logger);
    }

    if (this.config.deviceLookupEnabled) {
      this.deviceEnricher = createDeviceEnricher(logger, undefined, stateStore);
    }

    this.logger.info(
      {
        geoIpEnabled: this.config.geoIpEnabled,
        deviceLookupEnabled: this.config.deviceLookupEnabled,
      },
      'Enrichment pipeline initialized',
    );
  }

  /**
   * Enrich a signal with all configured enrichers
   */
  async enrich(signal: SignalEnvelope): Promise<EnrichmentResult> {
    this.stats.total++;
    const startTime = Date.now();
    const errors: EnrichmentResult['errors'] = [];
    const enrichments: EnrichmentResult['enrichments'] = {};

    // Create timeout promise
    const timeoutPromise = new Promise<never>((_, reject) => {
      setTimeout(
        () => reject(new Error('Enrichment timeout')),
        this.config.timeoutMs,
      );
    });

    try {
      // Run enrichers in parallel
      const enrichmentPromises: Promise<void>[] = [];

      // GeoIP enrichment
      if (this.geoIpEnricher && signal.metadata.source.sourceIp) {
        enrichmentPromises.push(
          this.runGeoIpEnrichment(signal, enrichments, errors),
        );
      }

      // Device enrichment
      if (this.deviceEnricher && signal.device?.deviceId) {
        enrichmentPromises.push(
          this.runDeviceEnrichment(signal, enrichments, errors),
        );
      }

      // Wait for all enrichments with timeout
      await Promise.race([
        Promise.all(enrichmentPromises),
        timeoutPromise,
      ]);

      const durationMs = Date.now() - startTime;

      // Determine success status
      if (errors.length === 0) {
        this.stats.successful++;
        return { success: true, enrichments, errors: [], durationMs };
      } else if (Object.keys(enrichments).length > 0) {
        this.stats.partial++;
        return { success: true, enrichments, errors, durationMs };
      } else {
        this.stats.failed++;
        return { success: false, enrichments, errors, durationMs };
      }
    } catch (error) {
      const durationMs = Date.now() - startTime;
      this.stats.failed++;

      if (error instanceof Error && error.message === 'Enrichment timeout') {
        errors.push({
          enricherName: 'pipeline',
          message: 'Enrichment timed out',
          recoverable: true,
        });
      } else {
        errors.push({
          enricherName: 'pipeline',
          message: error instanceof Error ? error.message : 'Unknown error',
          recoverable: false,
        });
      }

      return {
        success: this.config.continueOnError,
        enrichments,
        errors,
        durationMs,
      };
    }
  }

  /**
   * Run GeoIP enrichment
   */
  private async runGeoIpEnrichment(
    signal: SignalEnvelope,
    enrichments: EnrichmentResult['enrichments'],
    errors: EnrichmentResult['errors'],
  ): Promise<void> {
    try {
      const ip = signal.metadata.source.sourceIp;
      if (!ip || !this.geoIpEnricher) return;

      const result = await this.geoIpEnricher.enrich(ip);
      if (result) {
        enrichments.geoIp = result;
      }
    } catch (error) {
      this.logger.warn({ error }, 'GeoIP enrichment failed');
      errors.push({
        enricherName: 'geoip',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
      });
    }
  }

  /**
   * Run device enrichment
   */
  private async runDeviceEnrichment(
    signal: SignalEnvelope,
    enrichments: EnrichmentResult['enrichments'],
    errors: EnrichmentResult['errors'],
  ): Promise<void> {
    try {
      const deviceId = signal.device?.deviceId;
      if (!deviceId || !this.deviceEnricher) return;

      const result = await this.deviceEnricher.enrich(deviceId, {
        tenantId: signal.metadata.tenantId,
        location: signal.location
          ? {
              latitude: signal.location.latitude,
              longitude: signal.location.longitude,
            }
          : undefined,
        deviceInfo: signal.device,
      });

      enrichments.deviceLookup = result;
    } catch (error) {
      this.logger.warn({ error }, 'Device enrichment failed');
      errors.push({
        enricherName: 'device',
        message: error instanceof Error ? error.message : 'Unknown error',
        recoverable: true,
      });
    }
  }

  /**
   * Apply enrichment result to signal
   */
  applyEnrichment(
    signal: SignalEnvelope,
    result: EnrichmentResult,
  ): SignalEnvelope {
    return {
      ...signal,
      enrichment: {
        ...signal.enrichment,
        geoIp: result.enrichments.geoIp ?? signal.enrichment?.geoIp,
        deviceLookup: result.enrichments.deviceLookup ?? signal.enrichment?.deviceLookup,
        custom: {
          ...signal.enrichment?.custom,
          ...result.enrichments.custom,
        },
      },
    };
  }

  /**
   * Get pipeline statistics
   */
  getStats(): {
    total: number;
    successful: number;
    partial: number;
    failed: number;
    successRate: number;
    geoIp?: ReturnType<GeoIpEnricherService['getStats']>;
    device?: ReturnType<DeviceEnricherService['getStats']>;
  } {
    return {
      ...this.stats,
      successRate:
        this.stats.total > 0
          ? (this.stats.successful + this.stats.partial) / this.stats.total
          : 1,
      geoIp: this.geoIpEnricher?.getStats(),
      device: this.deviceEnricher?.getStats(),
    };
  }

  /**
   * Reset statistics
   */
  resetStats(): void {
    this.stats = { total: 0, successful: 0, partial: 0, failed: 0 };
    this.geoIpEnricher?.resetStats();
    this.deviceEnricher?.resetStats();
  }
}

/**
 * Create an enrichment pipeline instance
 */
export function createEnrichmentPipeline(
  logger: Logger,
  config?: Partial<EnrichmentPipelineConfig>,
  stateStore?: StateStore,
): EnrichmentPipeline {
  return new EnrichmentPipeline(logger, config, stateStore);
}
