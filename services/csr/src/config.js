"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultSourcePrecedence = void 0;
exports.sourcePriority = sourcePriority;
exports.defaultSourcePrecedence = {
    sources: ['crm', 'app_sdk', 'partner']
};
function sourcePriority(source, config) {
    const normalized = source.toLowerCase();
    const idx = config.sources.findIndex((s) => s === normalized);
    return idx === -1 ? config.sources.length : idx;
}
