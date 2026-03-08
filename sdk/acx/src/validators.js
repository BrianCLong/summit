"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DarkPatternLinter = void 0;
class DarkPatternLinter {
    disallowedPatterns;
    constructor(disallowedPatterns) {
        this.disallowedPatterns = disallowedPatterns;
    }
    lintPack(pack) {
        return Object.values(pack.locales).flatMap((locale) => this.lintLocale(locale.locale, locale));
    }
    lintLocale(locale, copy) {
        const findings = [];
        const inspect = (value) => {
            if (typeof value === 'string') {
                this.disallowedPatterns.forEach((pattern) => {
                    if (value.toLowerCase().includes(pattern.toLowerCase())) {
                        findings.push({
                            locale,
                            message: `Found disallowed pattern "${pattern}" in text: ${value}`,
                            pattern
                        });
                    }
                });
            }
            else if (Array.isArray(value)) {
                value.forEach(inspect);
            }
            else if (value && typeof value === 'object') {
                Object.values(value).forEach(inspect);
            }
        };
        inspect(copy);
        return findings;
    }
}
exports.DarkPatternLinter = DarkPatternLinter;
