"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tokenize = tokenize;
exports.jaccardSimilarity = jaccardSimilarity;
exports.normalizedLevenshtein = normalizedLevenshtein;
exports.phoneticSignature = phoneticSignature;
exports.calculateNameSimilarity = calculateNameSimilarity;
exports.calculatePropertyOverlap = calculatePropertyOverlap;
exports.calculateSemanticSimilarity = calculateSemanticSimilarity;
exports.calculateGeographicProximity = calculateGeographicProximity;
exports.calculateLocationOverlap = calculateLocationOverlap;
exports.calculateTemporalCoOccurrence = calculateTemporalCoOccurrence;
exports.calculateDeviceIdMatch = calculateDeviceIdMatch;
exports.calculateAccountIdMatch = calculateAccountIdMatch;
exports.calculateIpAddressOverlap = calculateIpAddressOverlap;
exports.extractFeatures = extractFeatures;
const geolib_1 = require("geolib");
const luxon_1 = require("luxon");
/**
 * Text tokenization for Jaccard similarity
 */
function tokenize(text) {
    return text
        .toLowerCase()
        .replace(/[^a-z0-9\s]/g, ' ')
        .split(/\s+/)
        .filter(Boolean);
}
/**
 * Jaccard similarity between two token sets
 */
function jaccardSimilarity(a, b) {
    const setA = new Set(a);
    const setB = new Set(b);
    const intersection = [...setA].filter((token) => setB.has(token));
    const union = new Set([...setA, ...setB]);
    return union.size === 0 ? 0 : intersection.length / union.size;
}
/**
 * Calculate Levenshtein distance between two strings
 */
function levenshteinDistance(a, b) {
    if (a === b) {
        return 0;
    }
    if (a.length === 0) {
        return b.length;
    }
    if (b.length === 0) {
        return a.length;
    }
    const matrix = Array.from({ length: a.length + 1 }, () => Array(b.length + 1).fill(0));
    for (let i = 0; i <= a.length; i++) {
        matrix[i][0] = i;
    }
    for (let j = 0; j <= b.length; j++) {
        matrix[0][j] = j;
    }
    for (let i = 1; i <= a.length; i++) {
        for (let j = 1; j <= b.length; j++) {
            const cost = a[i - 1] === b[j - 1] ? 0 : 1;
            matrix[i][j] = Math.min(matrix[i - 1][j] + 1, matrix[i][j - 1] + 1, matrix[i - 1][j - 1] + cost);
        }
    }
    return matrix[a.length][b.length];
}
/**
 * Normalized Levenshtein distance (0 = different, 1 = identical)
 */
function normalizedLevenshtein(a, b) {
    if (a === b) {
        return 1;
    }
    const distance = levenshteinDistance(a.toLowerCase(), b.toLowerCase());
    return 1 - distance / Math.max(a.length, b.length, 1);
}
/**
 * Simplified Soundex-like phonetic encoding
 */
function phoneticSignature(text) {
    const cleaned = text.toLowerCase().replace(/[^a-z]/g, '');
    if (!cleaned) {
        return '';
    }
    const first = cleaned[0];
    const consonants = cleaned.replace(/[aeiou]/g, '');
    return `${first}${consonants.slice(0, 3).padEnd(3, '0')}`;
}
/**
 * Calculate name similarity between two entities
 */
function calculateNameSimilarity(entityA, entityB) {
    const tokensA = tokenize(entityA.name);
    const tokensB = tokenize(entityB.name);
    const jaccard = jaccardSimilarity(tokensA, tokensB);
    const editDistance = normalizedLevenshtein(entityA.name, entityB.name);
    const phonetic = phoneticSignature(entityA.name) === phoneticSignature(entityB.name) ? 1 : 0;
    // Check alias similarity
    let aliasSimilarity = 0;
    if (entityA.aliases && entityB.aliases) {
        const aliasScores = [];
        for (const aliasA of entityA.aliases) {
            for (const aliasB of entityB.aliases) {
                const score = Math.max(jaccardSimilarity(tokenize(aliasA), tokenize(aliasB)), normalizedLevenshtein(aliasA, aliasB));
                aliasScores.push(score);
            }
        }
        aliasSimilarity = aliasScores.length > 0 ? Math.max(...aliasScores) : 0;
    }
    // Also check if entity name matches any alias
    if (entityA.aliases) {
        for (const alias of entityA.aliases) {
            const score = normalizedLevenshtein(alias, entityB.name);
            aliasSimilarity = Math.max(aliasSimilarity, score);
        }
    }
    if (entityB.aliases) {
        for (const alias of entityB.aliases) {
            const score = normalizedLevenshtein(alias, entityA.name);
            aliasSimilarity = Math.max(aliasSimilarity, score);
        }
    }
    const nameSimilarity = Math.max(jaccard, editDistance, aliasSimilarity);
    return {
        nameSimilarity,
        nameJaccard: jaccard,
        nameLevenshtein: editDistance,
        phoneticSimilarity: phonetic,
        aliasSimilarity,
    };
}
/**
 * Calculate property overlap between two entities
 */
function calculatePropertyOverlap(entityA, entityB) {
    const keysA = Object.keys(entityA.attributes);
    const keysB = Object.keys(entityB.attributes);
    const overlap = keysA.filter((key) => keysB.includes(key));
    return Math.max(overlap.length / Math.max(keysA.length, keysB.length, 1), 0);
}
/**
 * Calculate semantic similarity based on matching attribute values
 */
function calculateSemanticSimilarity(entityA, entityB) {
    const keys = new Set([
        ...Object.keys(entityA.attributes),
        ...Object.keys(entityB.attributes),
    ]);
    let matches = 0;
    for (const key of keys) {
        const valA = entityA.attributes[key];
        const valB = entityB.attributes[key];
        if (valA && valB && valA === valB) {
            matches++;
        }
    }
    return keys.size === 0 ? 0 : matches / keys.size;
}
/**
 * Calculate geographic proximity (0 = far apart, 1 = same location)
 */
function calculateGeographicProximity(entityA, entityB) {
    if (!entityA.locations?.length || !entityB.locations?.length) {
        return 0;
    }
    // Find minimum distance between any pair of locations
    let minDistance = Infinity;
    for (const locA of entityA.locations) {
        for (const locB of entityB.locations) {
            const dist = (0, geolib_1.getDistance)({ latitude: locA.lat, longitude: locA.lon }, { latitude: locB.lat, longitude: locB.lon });
            minDistance = Math.min(minDistance, dist);
        }
    }
    // Convert to similarity score (closer = higher score)
    // Using exponential decay: e^(-distance/10000)
    // 10km = ~0.37, 1km = ~0.90, 100m = ~0.99
    return Math.exp(-minDistance / 10000);
}
/**
 * Calculate location overlap (shared locations)
 */
function calculateLocationOverlap(entityA, entityB) {
    if (!entityA.locations?.length || !entityB.locations?.length) {
        return 0;
    }
    let overlaps = 0;
    const threshold = 100; // 100 meters threshold for "same" location
    for (const locA of entityA.locations) {
        for (const locB of entityB.locations) {
            const dist = (0, geolib_1.getDistance)({ latitude: locA.lat, longitude: locA.lon }, { latitude: locB.lat, longitude: locB.lon });
            if (dist <= threshold) {
                overlaps++;
                break; // Count each location in A only once
            }
        }
    }
    return overlaps / Math.max(entityA.locations.length, entityB.locations.length);
}
/**
 * Calculate temporal co-occurrence (overlapping time windows)
 */
function calculateTemporalCoOccurrence(entityA, entityB) {
    if (!entityA.timestamps?.length || !entityB.timestamps?.length) {
        return 0;
    }
    const datesA = entityA.timestamps.map(t => luxon_1.DateTime.fromISO(t));
    const datesB = entityB.timestamps.map(t => luxon_1.DateTime.fromISO(t));
    // Check for timestamps within 1 hour of each other
    let coOccurrences = 0;
    for (const dateA of datesA) {
        for (const dateB of datesB) {
            const diffHours = Math.abs(dateA.diff(dateB, 'hours').hours);
            if (diffHours <= 1) {
                coOccurrences++;
            }
        }
    }
    const maxPossible = Math.min(datesA.length, datesB.length);
    return maxPossible > 0 ? Math.min(coOccurrences / maxPossible, 1) : 0;
}
/**
 * Calculate device ID match (Jaccard similarity of device ID sets)
 */
function calculateDeviceIdMatch(entityA, entityB) {
    if (!entityA.deviceIds?.length || !entityB.deviceIds?.length) {
        return 0;
    }
    const setA = new Set(entityA.deviceIds);
    const setB = new Set(entityB.deviceIds);
    const intersection = [...setA].filter(id => setB.has(id));
    const union = new Set([...setA, ...setB]);
    return intersection.length / union.size;
}
/**
 * Calculate account ID match
 */
function calculateAccountIdMatch(entityA, entityB) {
    if (!entityA.accountIds?.length || !entityB.accountIds?.length) {
        return 0;
    }
    const setA = new Set(entityA.accountIds);
    const setB = new Set(entityB.accountIds);
    const intersection = [...setA].filter(id => setB.has(id));
    const union = new Set([...setA, ...setB]);
    return intersection.length / union.size;
}
/**
 * Calculate IP address overlap
 */
function calculateIpAddressOverlap(entityA, entityB) {
    if (!entityA.ipAddresses?.length || !entityB.ipAddresses?.length) {
        return 0;
    }
    const setA = new Set(entityA.ipAddresses);
    const setB = new Set(entityB.ipAddresses);
    const intersection = [...setA].filter(ip => setB.has(ip));
    return intersection.length / Math.max(setA.size, setB.size);
}
/**
 * Extract all features for a pair of entities
 */
function extractFeatures(entityA, entityB) {
    const nameFeatures = calculateNameSimilarity(entityA, entityB);
    return {
        // Name features
        ...nameFeatures,
        // Type and property features
        typeMatch: entityA.type === entityB.type,
        propertyOverlap: calculatePropertyOverlap(entityA, entityB),
        semanticSimilarity: calculateSemanticSimilarity(entityA, entityB),
        // Geo/temporal features
        geographicProximity: calculateGeographicProximity(entityA, entityB),
        temporalCoOccurrence: calculateTemporalCoOccurrence(entityA, entityB),
        locationOverlap: calculateLocationOverlap(entityA, entityB),
        // Device/account features
        deviceIdMatch: calculateDeviceIdMatch(entityA, entityB),
        accountIdMatch: calculateAccountIdMatch(entityA, entityB),
        ipAddressOverlap: calculateIpAddressOverlap(entityA, entityB),
        // Metadata
        editDistance: nameFeatures.nameLevenshtein,
    };
}
