"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.normalizeRecord = normalizeRecord;
function normalizeRecord(raw) {
    return {
        id: `EVID:WARCOP:${raw.source}:${raw.external_id}`,
        ...raw,
    };
}
