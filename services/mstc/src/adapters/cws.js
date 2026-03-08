"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toCwsTaxonomy = void 0;
const utils_1 = require("../utils");
const toCwsTaxonomy = (canon) => {
    const byTag = new Map();
    for (const [locale, terms] of Object.entries(canon)) {
        for (const term of terms) {
            const existing = byTag.get(term.tag);
            const variants = (0, utils_1.unique)((0, utils_1.sortBy)(term.variants.map((variant) => variant.value), (value) => (0, utils_1.normalize)(value)));
            if (existing) {
                existing.locales.push(locale);
                existing.canonicalByLocale[locale] = term.canonical;
                existing.variantMap[locale] = variants;
            }
            else {
                byTag.set(term.tag, {
                    tag: term.tag,
                    vertical: term.vertical,
                    locales: [locale],
                    canonicalByLocale: { [locale]: term.canonical },
                    variantMap: { [locale]: variants },
                });
            }
        }
    }
    const exports = [];
    for (const record of byTag.values()) {
        record.locales = (0, utils_1.sortBy)(record.locales, (locale) => locale);
        exports.push(record);
    }
    return (0, utils_1.sortBy)(exports, (entry) => entry.tag);
};
exports.toCwsTaxonomy = toCwsTaxonomy;
