"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.OCRHookEnricher = exports.EXIFScrubEnricher = exports.HashEnricher = exports.LanguageEnricher = exports.GeoIPEnricher = void 0;
const base_js_1 = require("./base.js");
class GeoIPEnricher extends base_js_1.BaseEnricher {
    async enrich(event) {
        const ip = event.data[this.config.config.ipField || 'ip'];
        if (!ip)
            return { enrichedData: {}, metadata: {} };
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
exports.GeoIPEnricher = GeoIPEnricher;
class LanguageEnricher extends base_js_1.BaseEnricher {
    async enrich(event) {
        const text = event.data[this.config.config.textField || 'text'];
        if (!text)
            return { enrichedData: {}, metadata: {} };
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
exports.LanguageEnricher = LanguageEnricher;
class HashEnricher extends base_js_1.BaseEnricher {
    async enrich(event) {
        const fields = this.config.config.fields || [];
        const crypto = require('crypto');
        const enriched = {};
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
exports.HashEnricher = HashEnricher;
class EXIFScrubEnricher extends base_js_1.BaseEnricher {
    async enrich(event) {
        // Mock scrubbing
        return {
            enrichedData: {
                exif_scrubbed: true
            },
            metadata: {}
        };
    }
}
exports.EXIFScrubEnricher = EXIFScrubEnricher;
class OCRHookEnricher extends base_js_1.BaseEnricher {
    async enrich(event) {
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
exports.OCRHookEnricher = OCRHookEnricher;
