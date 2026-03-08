"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeWhitespace = normalizeWhitespace;
exports.splitParagraphs = splitParagraphs;
exports.dedupeParagraphs = dedupeParagraphs;
exports.detectLanguage = detectLanguage;
exports.extractKeyValues = extractKeyValues;
exports.extractBudgetUSD = extractBudgetUSD;
exports.extractLatency = extractLatency;
exports.extractContextLimit = extractContextLimit;
exports.extractEntities = extractEntities;
exports.findAmbiguousPhrases = findAmbiguousPhrases;
exports.scoreSkillOverlap = scoreSkillOverlap;
exports.average = average;
function normalizeWhitespace(value) {
    return value.replace(/\s+/g, ' ').trim();
}
function splitParagraphs(text) {
    return text
        .split(/\n{2,}/)
        .map((paragraph) => paragraph.trim())
        .filter(Boolean);
}
function dedupeParagraphs(text) {
    const seen = new Set();
    const paragraphs = splitParagraphs(text);
    const deduped = paragraphs.filter((paragraph) => {
        const normalized = normalizeWhitespace(paragraph.toLowerCase());
        if (seen.has(normalized)) {
            return false;
        }
        seen.add(normalized);
        return true;
    });
    return deduped.join('\n\n');
}
function detectLanguage(text) {
    const lower = text.toLowerCase();
    if (/¿|¡|ñ/.test(lower)) {
        return 'es';
    }
    if (/[éèàçîôû]/.test(lower)) {
        return 'fr';
    }
    if (/[äöüß]/.test(lower)) {
        return 'de';
    }
    if (/^[\x00-\x7F]*$/.test(text)) {
        return 'en';
    }
    return 'unknown';
}
function extractKeyValues(text) {
    const map = {};
    const regex = /^(?<key>[A-Za-z][A-Za-z0-9 _-]+):\s*(?<value>.+)$/gm;
    let match;
    while ((match = regex.exec(text)) !== null) {
        const key = match.groups?.key?.toLowerCase().trim();
        const value = match.groups?.value?.trim();
        if (key && value) {
            map[key] = value;
        }
    }
    return map;
}
function extractBudgetUSD(text) {
    const match = text.match(/\$?(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i);
    if (match) {
        return Number.parseFloat(match[1]);
    }
    return undefined;
}
function extractLatency(text) {
    const match = text.match(/p95\s*(\d{2,5})\s*ms/i);
    if (match) {
        return Number.parseInt(match[1], 10);
    }
    return undefined;
}
function extractContextLimit(text) {
    const match = text.match(/context\s*[:=]\s*(\d{3,6})\s*tokens/i);
    if (match) {
        return Number.parseInt(match[1], 10);
    }
    return undefined;
}
function extractEntities(text) {
    const matches = text.match(/(?:repo|service|component|dataset)[:=]\s*([A-Za-z0-9._\/-]+)/gi);
    if (!matches) {
        return [];
    }
    return matches
        .map((entry) => entry.split(/[:=]/)[1]?.trim())
        .filter((entity) => Boolean(entity))
        .map((entity) => entity.replace(/,$/, ''));
}
function findAmbiguousPhrases(text) {
    const phrases = ['tbd', 'maybe', 'approximately', 'roughly', 'asap', 'later'];
    const lower = text.toLowerCase();
    return phrases.filter((phrase) => lower.includes(phrase));
}
function scoreSkillOverlap(skills, tags) {
    const normalizedSkills = new Set(skills.map((skill) => skill.toLowerCase()));
    const normalizedTags = new Set(tags.map((tag) => tag.toLowerCase()));
    let overlap = 0;
    normalizedTags.forEach((tag) => {
        if (normalizedSkills.has(tag)) {
            overlap += 1;
        }
    });
    return normalizedSkills.size === 0 ? 0 : overlap / normalizedSkills.size;
}
function average(numbers) {
    if (numbers.length === 0) {
        return 0;
    }
    return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}
