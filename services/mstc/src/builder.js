"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.DEFAULT_SUPPORTED_LOCALES = exports.DEFAULT_MSTC_SERVICE = exports.MSTCService = void 0;
const canon_1 = require("./data/canon");
const utils_1 = require("./utils");
class MSTCService {
    canon;
    constructor(seed = canon_1.MSTC_LOCALE_CANON) {
        this.canon = seed;
    }
    static bootstrap() {
        return new MSTCService((0, canon_1.buildLocaleCanon)());
    }
    getLocales() {
        return (0, utils_1.sortBy)(Object.keys(this.canon), (locale) => locale);
    }
    hasLocale(locale) {
        return Boolean(this.canon[locale]);
    }
    getCanon(locale, vertical) {
        const records = this.canon[locale] ?? [];
        if (!vertical) {
            return records;
        }
        return records.filter((record) => record.vertical === vertical);
    }
    getByTag(locale, tag) {
        return this.canon[locale]?.find((entry) => entry.tag === tag);
    }
    match(locale, text, vertical) {
        const canon = this.getCanon(locale, vertical);
        if (!canon.length || !text.trim()) {
            return [];
        }
        const normalizedHaystack = (0, utils_1.normalize)(text);
        const matches = [];
        for (const entry of canon) {
            const candidates = (0, utils_1.unique)([
                entry.canonical,
                ...entry.variants.map((variant) => variant.value),
            ]);
            for (const candidate of candidates) {
                const normalizedCandidate = (0, utils_1.normalize)(candidate);
                if (!normalizedCandidate || normalizedCandidate.length < 2) {
                    continue;
                }
                if (normalizedHaystack.includes(normalizedCandidate)) {
                    matches.push({
                        tag: entry.tag,
                        matched: candidate,
                        canonical: entry.canonical,
                        locale: entry.locale,
                        vertical: entry.vertical,
                        confidence: entry.confidence,
                    });
                    break;
                }
            }
        }
        return matches;
    }
    getCanonMap() {
        return this.canon;
    }
}
exports.MSTCService = MSTCService;
exports.DEFAULT_MSTC_SERVICE = new MSTCService();
exports.DEFAULT_SUPPORTED_LOCALES = canon_1.SUPPORTED_LOCALES;
