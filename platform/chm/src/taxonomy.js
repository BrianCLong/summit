"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTaxonomy = exports.TaxonomyRegistry = void 0;
exports.parseTaxonomy = parseTaxonomy;
exports.normalizeCode = normalizeCode;
const zod_1 = require("zod");
const config_js_1 = require("./config.js");
class TaxonomyRegistry {
    taxonomy = new Map();
    bus;
    constructor(bus, entries) {
        this.bus = bus;
        entries.forEach((entry) => {
            const parsed = config_js_1.taxonomySchema.parse(entry);
            this.taxonomy.set(parsed.code, parsed);
        });
    }
    list() {
        return Array.from(this.taxonomy.values());
    }
    get(code) {
        return this.taxonomy.get(code);
    }
    applyTag(documentId, code, derivedFrom) {
        const entry = this.taxonomy.get(code);
        if (!entry) {
            throw new Error(`Unknown taxonomy code ${code}`);
        }
        const tag = {
            documentId,
            tag: code,
            classification: entry.level,
            derivedFrom
        };
        this.bus.emitTagApplied(tag);
        return tag;
    }
    canDowngrade(current, target) {
        if (current === target)
            return true;
        const currentIdx = config_js_1.classificationLevels.indexOf(current);
        const targetIdx = config_js_1.classificationLevels.indexOf(target);
        return targetIdx >= 0 && targetIdx > currentIdx;
    }
    downgradeTag(existing, targetLevel, approvers) {
        const entry = this.taxonomy.get(existing.tag);
        if (!entry)
            throw new Error(`Unknown taxonomy code ${existing.tag}`);
        if (!entry.downgradeTo.includes(targetLevel) || !this.canDowngrade(existing.classification, targetLevel)) {
            throw new Error(`Downgrade from ${existing.classification} to ${targetLevel} not permitted`);
        }
        const downgraded = {
            ...existing,
            classification: targetLevel
        };
        this.bus.emitTagDowngraded(existing, downgraded, approvers);
        return downgraded;
    }
    upsert(entry) {
        const parsed = config_js_1.taxonomySchema.parse(entry);
        this.taxonomy.set(parsed.code, parsed);
    }
}
exports.TaxonomyRegistry = TaxonomyRegistry;
exports.defaultTaxonomy = [
    {
        code: 'CHM-TS',
        description: 'Top secret handling with strict residency',
        level: 'TS',
        downgradeTo: ['S', 'C']
    },
    {
        code: 'CHM-S',
        description: 'Secret handling with controlled distribution',
        level: 'S',
        downgradeTo: ['C', 'U']
    },
    {
        code: 'CHM-C',
        description: 'Confidential materials',
        level: 'C',
        downgradeTo: ['U']
    },
    {
        code: 'CHM-U',
        description: 'Unclassified but tracked content',
        level: 'U',
        downgradeTo: ['U']
    }
];
function parseTaxonomy(input) {
    const schema = zod_1.z.array(config_js_1.taxonomySchema);
    return schema.parse(input);
}
function normalizeCode(code) {
    return code.toUpperCase().trim();
}
