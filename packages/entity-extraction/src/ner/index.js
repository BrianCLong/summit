"use strict";
/**
 * Named Entity Recognition (NER)
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.NERExtractor = void 0;
class NERExtractor {
    options;
    customPatterns = new Map();
    constructor(options = {}) {
        this.options = {
            language: options.language ?? 'en',
            customTypes: options.customTypes ?? [],
            minConfidence: options.minConfidence ?? 0.5,
            includeNested: options.includeNested ?? false,
            includeDates: options.includeDates ?? true,
            resolveEntities: options.resolveEntities ?? false,
            linkToKnowledgeBase: options.linkToKnowledgeBase ?? false,
        };
        this.initializePatterns();
    }
    /**
     * Extract named entities from text
     */
    extract(text) {
        const entities = [];
        // Extract different entity types
        entities.push(...this.extractPersons(text));
        entities.push(...this.extractOrganizations(text));
        entities.push(...this.extractLocations(text));
        if (this.options.includeDates) {
            entities.push(...this.extractDates(text));
            entities.push(...this.extractTimes(text));
        }
        entities.push(...this.extractMoney(text));
        entities.push(...this.extractPercentages(text));
        entities.push(...this.extractCustomEntities(text));
        // Filter by confidence threshold
        const filtered = entities.filter((e) => e.confidence >= this.options.minConfidence);
        // Sort by position
        filtered.sort((a, b) => a.start - b.start);
        // Remove overlapping entities if not including nested
        if (!this.options.includeNested) {
            return this.removeOverlapping(filtered);
        }
        return filtered;
    }
    /**
     * Extract entities by type
     */
    extractByType(text, type) {
        const allEntities = this.extract(text);
        return allEntities.filter((e) => e.type === type);
    }
    /**
     * Extract person names
     */
    extractPersons(text) {
        const entities = [];
        // Simplified person name extraction
        // In production, use a proper NER model or library
        const titlePattern = /\b(Mr|Mrs|Ms|Dr|Prof|Sir|Lord|Lady|Captain|Colonel)\.\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)/g;
        let match;
        while ((match = titlePattern.exec(text)) !== null) {
            entities.push({
                text: match[0],
                type: 'PERSON',
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.9,
                metadata: { title: match[1] },
            });
        }
        // Simple capitalized word patterns
        const namePattern = /\b[A-Z][a-z]+\s+[A-Z][a-z]+(?:\s+[A-Z][a-z]+)?\b/g;
        while ((match = namePattern.exec(text)) !== null) {
            // Check if not already captured
            const overlaps = entities.some((e) => match.index >= e.start && match.index < e.end);
            if (!overlaps) {
                entities.push({
                    text: match[0],
                    type: 'PERSON',
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.7,
                });
            }
        }
        return entities;
    }
    /**
     * Extract organization names
     */
    extractOrganizations(text) {
        const entities = [];
        // Organization patterns
        const patterns = [
            /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*)\s+(Inc|Corp|LLC|Ltd|Company|Corporation|Incorporated)\b/g,
            /\b([A-Z][A-Z]+)\b/g, // Acronyms
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    text: match[0],
                    type: 'ORGANIZATION',
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.8,
                });
            }
        }
        return entities;
    }
    /**
     * Extract location names
     */
    extractLocations(text) {
        const entities = [];
        // Common location patterns
        const cityStatePattern = /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*),\s+([A-Z]{2})\b/g;
        let match;
        while ((match = cityStatePattern.exec(text)) !== null) {
            entities.push({
                text: match[0],
                type: 'LOCATION',
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.9,
                metadata: { city: match[1], state: match[2] },
            });
        }
        // Countries and cities (simplified)
        const locationPattern = /\b(United States|United Kingdom|China|Russia|Japan|Germany|France|New York|London|Paris|Tokyo|Beijing|Moscow)\b/g;
        while ((match = locationPattern.exec(text)) !== null) {
            entities.push({
                text: match[0],
                type: 'LOCATION',
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.95,
            });
        }
        return entities;
    }
    /**
     * Extract dates
     */
    extractDates(text) {
        const entities = [];
        // Various date patterns
        const patterns = [
            /\b\d{1,2}\/\d{1,2}\/\d{2,4}\b/g, // MM/DD/YYYY
            /\b\d{4}-\d{2}-\d{2}\b/g, // YYYY-MM-DD
            /\b(January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2},?\s+\d{4}\b/gi,
            /\b(Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec)\s+\d{1,2},?\s+\d{4}\b/gi,
        ];
        for (const pattern of patterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    text: match[0],
                    type: 'DATE',
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.95,
                });
            }
        }
        return entities;
    }
    /**
     * Extract times
     */
    extractTimes(text) {
        const entities = [];
        const timePattern = /\b\d{1,2}:\d{2}(?::\d{2})?\s*(?:AM|PM|am|pm)?\b/g;
        let match;
        while ((match = timePattern.exec(text)) !== null) {
            entities.push({
                text: match[0],
                type: 'TIME',
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.95,
            });
        }
        return entities;
    }
    /**
     * Extract money amounts
     */
    extractMoney(text) {
        const entities = [];
        const moneyPattern = /\$\d+(?:,\d{3})*(?:\.\d{2})?|\d+(?:,\d{3})*(?:\.\d{2})?\s*(?:USD|EUR|GBP|JPY)/gi;
        let match;
        while ((match = moneyPattern.exec(text)) !== null) {
            entities.push({
                text: match[0],
                type: 'MONEY',
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.95,
            });
        }
        return entities;
    }
    /**
     * Extract percentages
     */
    extractPercentages(text) {
        const entities = [];
        const percentPattern = /\b\d+(?:\.\d+)?%/g;
        let match;
        while ((match = percentPattern.exec(text)) !== null) {
            entities.push({
                text: match[0],
                type: 'PERCENT',
                start: match.index,
                end: match.index + match[0].length,
                confidence: 0.98,
            });
        }
        return entities;
    }
    /**
     * Extract custom entity types
     */
    extractCustomEntities(text) {
        const entities = [];
        for (const [type, pattern] of this.customPatterns) {
            let match;
            while ((match = pattern.exec(text)) !== null) {
                entities.push({
                    text: match[0],
                    type: 'CUSTOM',
                    start: match.index,
                    end: match.index + match[0].length,
                    confidence: 0.8,
                    metadata: { customType: type },
                });
            }
        }
        return entities;
    }
    /**
     * Add custom entity pattern
     */
    addCustomPattern(type, pattern) {
        this.customPatterns.set(type, pattern);
    }
    /**
     * Remove overlapping entities
     */
    removeOverlapping(entities) {
        if (entities.length === 0) {
            return [];
        }
        const result = [entities[0]];
        for (let i = 1; i < entities.length; i++) {
            const current = entities[i];
            const last = result[result.length - 1];
            // Check if overlapping
            if (current.start >= last.end) {
                result.push(current);
            }
            else if (current.confidence > last.confidence) {
                // Replace with higher confidence entity
                result[result.length - 1] = current;
            }
        }
        return result;
    }
    /**
     * Initialize built-in patterns
     */
    initializePatterns() {
        // Weapon patterns
        this.addCustomPattern('WEAPON', /\b(AK-47|M16|pistol|rifle|handgun|firearm|explosive|bomb|missile|grenade)\b/gi);
        // Vehicle patterns
        this.addCustomPattern('VEHICLE', /\b(Toyota|Honda|Ford|Chevrolet|BMW|Mercedes|aircraft|helicopter|ship|submarine)\b/gi);
        // Facility patterns
        this.addCustomPattern('FACILITY', /\b(airport|hospital|school|university|prison|facility|base|compound)\b/gi);
    }
}
exports.NERExtractor = NERExtractor;
__exportStar(require("./multilingual"), exports);
__exportStar(require("./confidence"), exports);
