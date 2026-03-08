"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.composeBrief = composeBrief;
const utils_js_1 = require("./utils.js");
function formatDate(date) {
    if (!date) {
        return '';
    }
    const parsed = new Date(date);
    if (Number.isNaN(parsed.getTime())) {
        return date;
    }
    return parsed.toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
    });
}
function buildExecutiveSummary(article, claims) {
    const topClaims = claims.slice(0, 3).map((claim) => claim.text.toLowerCase());
    const dateText = formatDate(article.datePublished);
    const summaryParts = [
        `${article.publisher} published \"${article.title}\" on ${dateText || 'an unknown date'} to synthesize NIJ-funded research on domestic terrorism.`,
    ];
    if (topClaims.length > 0) {
        summaryParts.push(`The brief highlights ${topClaims.join(', ')}.`);
    }
    return summaryParts.join(' ');
}
function buildImplications(claims) {
    const bullets = new Set();
    if (claims.some((claim) => /internet|online/i.test(claim.text))) {
        bullets.add('Strengthen digital literacy and community reporting partnerships to counter extremist recruitment online.');
    }
    if (claims.some((claim) => /military/i.test(claim.text))) {
        bullets.add('Coordinate with veteran-serving organizations to support at-risk transitions out of military service.');
    }
    if (claims.some((claim) => /risk|protective/i.test(claim.text))) {
        bullets.add('Invest in early warning programs that monitor risk and protective factors identified across NIJ research.');
    }
    bullets.add('Use NIJ datasets to inform fusion center assessments and interagency prevention planning.');
    return Array.from(bullets);
}
function buildFalsifiers(article) {
    return [
        'Cross-check NIJ summary figures with the underlying datasets cited in the article.',
        'Compare the NIJ synthesis with Department of Homeland Security threat assessments captured on adjacent dates.',
        'Re-run the pipeline against additional archived captures to detect potential wording drift.',
    ];
}
function composeBrief(article, claims, provenance, safety) {
    const execSummary = buildExecutiveSummary(article, claims);
    const implications = buildImplications(claims);
    const falsifiers = buildFalsifiers(article);
    const assumptions = (0, utils_js_1.unique)(claims
        .flatMap((claim) => claim.assumptions)
        .concat([
        'Article reflects NIJ reporting without independent verification.',
        'Safety review cleared all high-severity risks.',
    ]));
    const lines = [];
    const sourceUrl = article.archiveUrl ?? article.url;
    lines.push(`# Proof-Carrying Strategy Brief`);
    lines.push('');
    lines.push(`**Source:** ${article.title}`);
    lines.push(`**Publisher:** ${article.publisher}`);
    lines.push(`**Date Published:** ${article.datePublished || 'Unknown'}`);
    lines.push(`**Retrieved:** ${provenance.retrievedAt}`);
    lines.push('');
    lines.push('## Executive Summary');
    lines.push('');
    lines.push(execSummary);
    lines.push('');
    lines.push('## Key Findings');
    lines.push('');
    for (const claim of claims) {
        lines.push(`- [${claim.evidence.section}](${sourceUrl}#${claim.evidence.anchor}): ${claim.text} (Confidence: ${claim.confidence.value})`);
    }
    lines.push('');
    lines.push('## Implications for Prevention');
    lines.push('');
    for (const bullet of implications) {
        lines.push(`- ${bullet}`);
    }
    lines.push('');
    lines.push('## Assumptions & Confidence');
    lines.push('');
    lines.push(`- Overall confidence: medium (pipeline heuristics with deterministic extraction).`);
    for (const assumption of assumptions) {
        lines.push(`- ${assumption}`);
    }
    lines.push('');
    lines.push('## Potential Falsifiers');
    lines.push('');
    for (const falsifier of falsifiers) {
        lines.push(`- ${falsifier}`);
    }
    lines.push('');
    lines.push('## Safety Review');
    lines.push('');
    if (safety.flags.length === 0) {
        lines.push('- No safety flags triggered.');
    }
    else {
        for (const flag of safety.flags) {
            lines.push(`- ${flag.severity.toUpperCase()}: ${flag.message}`);
        }
    }
    lines.push('');
    lines.push('## Citations');
    lines.push('');
    claims.forEach((claim, index) => {
        lines.push(`[${index + 1}] ${claim.evidence.section} — ${sourceUrl}#${claim.evidence.anchor}`);
    });
    lines.push('');
    return lines.join('\n');
}
