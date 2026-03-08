"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateClaims = generateClaims;
const utils_js_1 = require("./utils.js");
const IDEOLOGY_TAGS = {
    'far-right': [/far[-\s]?right/i, /white suprem/i, /neo-?nazi/i],
    'far-left': [/far[-\s]?left/i, /left[-\s]?wing/i],
    islamist: [/islamist/i, /jihad/i],
    'single-issue': [/single-issue/i, /anti-abortion/i, /environmental/i],
};
function detectTags(text) {
    const matches = [];
    for (const [tag, patterns] of Object.entries(IDEOLOGY_TAGS)) {
        if (patterns.some((pattern) => pattern.test(text))) {
            matches.push(tag);
        }
    }
    return matches;
}
function scoreSentence(sentence) {
    let score = sentence.length;
    if (/\d/.test(sentence)) {
        score += 25;
    }
    if (/(increase|decrease|trend|risk|factor|research|finding|evidence|study)/i.test(sentence)) {
        score += 20;
    }
    if (/(extremist|terror|violence|military|internet|white suprem)/i.test(sentence)) {
        score += 15;
    }
    return score;
}
function collectCandidates(article) {
    const candidates = [];
    for (const section of article.sections) {
        const sentences = (0, utils_js_1.splitIntoSentences)(section.text);
        for (const sentence of sentences) {
            const normalized = sentence.replace(/\s+/g, ' ').trim();
            if (normalized.length < 40) {
                continue;
            }
            const score = scoreSentence(normalized);
            candidates.push({
                sentence: normalized,
                score,
                sectionId: section.id,
                sectionTitle: section.title,
            });
        }
    }
    return candidates;
}
function generateClaims(article, contentHash, minimum = 10) {
    const candidates = collectCandidates(article)
        .sort((a, b) => b.score - a.score)
        .slice(0, Math.max(minimum * 3, 40));
    const claims = [];
    const seenTexts = new Set();
    let counter = 1;
    for (const candidate of candidates) {
        if (seenTexts.has(candidate.sentence)) {
            continue;
        }
        const claimText = (0, utils_js_1.limitWords)(candidate.sentence.replace(/"/g, ''), 28);
        const ideologyTags = (0, utils_js_1.unique)(detectTags(candidate.sentence));
        const record = {
            claimId: `clm-${counter.toString().padStart(2, '0')}`,
            text: claimText,
            salience: candidate.score,
            ideologyTags,
            evidence: {
                snippet: (0, utils_js_1.limitWords)(candidate.sentence, 32),
                section: candidate.sectionTitle,
                anchor: candidate.sectionId,
                url: article.archiveUrl ?? article.url,
                contentHash,
            },
            confidence: {
                value: 'medium',
                rationale: 'Claim generated from NIJ article using deterministic heuristics.',
            },
            assumptions: [
                'Relies on NIJ-published synthesis without independent replication.',
            ],
        };
        claims.push(record);
        seenTexts.add(candidate.sentence);
        counter += 1;
        if (claims.length >= minimum) {
            break;
        }
    }
    return claims;
}
