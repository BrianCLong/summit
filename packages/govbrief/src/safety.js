"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviewSafety = reviewSafety;
const BLOCKED_PATTERNS = [
    {
        pattern: /how to/i,
        severity: 'medium',
        message: 'Potential instructional phrasing detected.',
    },
    {
        pattern: /explosive/i,
        severity: 'high',
        message: 'Explosive-related term detected.',
    },
    {
        pattern: /kill|attack|bomb/i,
        severity: 'medium',
        message: 'Violent operational term detected.',
    },
    {
        pattern: /doxx/i,
        severity: 'high',
        message: 'Potential doxxing reference detected.',
    },
    {
        pattern: /dehumaniz/i,
        severity: 'medium',
        message: 'Dehumanizing language detected.',
    },
];
function reviewSafety(claims) {
    const flags = [];
    for (const claim of claims) {
        for (const rule of BLOCKED_PATTERNS) {
            if (rule.pattern.test(claim.text)) {
                flags.push({
                    severity: rule.severity,
                    message: `${rule.message} (claim ${claim.claimId})`,
                });
            }
        }
    }
    return {
        flags,
        notes: flags.length === 0
            ? 'No safety risks detected.'
            : 'Review flagged content before release.',
        checkedAt: new Date().toISOString(),
    };
}
