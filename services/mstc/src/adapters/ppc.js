"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toPpcBlocklist = void 0;
const utils_1 = require("../utils");
const toPpcBlocklist = (canon, locales = Object.keys(canon)) => {
    const normalizedLocales = (0, utils_1.sortBy)(locales.filter((locale) => canon[locale]), (locale) => locale);
    const rows = [];
    for (const locale of normalizedLocales) {
        for (const entry of canon[locale] ?? []) {
            const phrases = (0, utils_1.unique)((0, utils_1.sortBy)([entry.canonical, ...entry.variants.map((variant) => variant.value)], (phrase) => (0, utils_1.normalize)(phrase)));
            rows.push({
                locale,
                tag: entry.tag,
                vertical: entry.vertical,
                phrases,
                confidence: entry.confidence,
            });
        }
    }
    return (0, utils_1.sortBy)(rows, (row) => `${row.locale}:${row.tag}`);
};
exports.toPpcBlocklist = toPpcBlocklist;
