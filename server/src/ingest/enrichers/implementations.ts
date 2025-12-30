
import { BaseEnricher, EnrichmentResult } from './base.js';
import { IngestionEvent } from '../../connectors/types.js';
import axios from 'axios';

export class GeoIPEnricher extends BaseEnricher {
  async enrich(event: IngestionEvent): Promise<EnrichmentResult> {
    const ip = event.data[this.config.config.ipField || 'ip'];
    if (!ip) return { enrichedData: {}, metadata: {} };

    // Mock GeoIP lookup for sandbox
    // In production, use MaxMind or API
    return {
      enrichedData: {
        geo: {
          country: 'US',
          city: 'San Francisco',
          lat: 37.7749,
          lon: -122.4194
        }
      },
      metadata: { source: 'GeoIP-Mock' }
    };
  }
}

export class LanguageEnricher extends BaseEnricher {
  async enrich(event: IngestionEvent): Promise<EnrichmentResult> {
    const text = event.data[this.config.config.textField || 'text'];
    if (!text) return { enrichedData: {}, metadata: {} };

    // Mock detection
    return {
      enrichedData: {
        language: 'en',
        confidence: 0.99
      },
      metadata: { source: 'LangDetect-Mock' }
    };
  }
}

export class HashEnricher extends BaseEnricher {
    async enrich(event: IngestionEvent): Promise<EnrichmentResult> {
        const fields = this.config.config.fields || [];
        const crypto = require('crypto');
        const enriched: any = {};

        for (const field of fields) {
            if (event.data[field]) {
                enriched[`${field}_md5`] = crypto.createHash('md5').update(String(event.data[field])).digest('hex');
                enriched[`${field}_sha256`] = crypto.createHash('sha256').update(String(event.data[field])).digest('hex');
            }
        }

        return {
            enrichedData: enriched,
            metadata: { algorithm: 'md5,sha256' }
        };
    }
}

export class EXIFScrubEnricher extends BaseEnricher {
    async enrich(event: IngestionEvent): Promise<EnrichmentResult> {
        // Mock scrubbing
        return {
            enrichedData: {
                exif_scrubbed: true
            },
            metadata: {}
        };
    }
}

export class OCRHookEnricher extends BaseEnricher {
    async enrich(event: IngestionEvent): Promise<EnrichmentResult> {
        // Mock OCR
        if (event.data.imageUrl) {
            return {
                enrichedData: {
                    ocr_text: "Mock OCR Text Result"
                },
                metadata: { engine: 'tesseract-mock' }
            };
        }
        return { enrichedData: {}, metadata: {} };
    }
}
