"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.toRegulatoryDigest = void 0;
const utils_1 = require("../utils");
const toRegulatoryDigest = (canon) => {
    const entries = [];
    for (const [locale, terms] of Object.entries(canon)) {
        for (const term of terms) {
            const regulators = term.regulatorNotes.map((note) => note.regulator);
            const notes = term.regulatorNotes.map((note) => note.note);
            entries.push({
                locale,
                vertical: term.vertical,
                tag: term.tag,
                canonical: term.canonical,
                regulators,
                notes,
                confidence: term.confidence,
            });
        }
    }
    return (0, utils_1.sortBy)(entries, (entry) => `${entry.locale}:${entry.tag}`);
};
exports.toRegulatoryDigest = toRegulatoryDigest;
