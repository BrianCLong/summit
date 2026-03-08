"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Storage = void 0;
const mem = new Map();
exports.Storage = {
    save(rec) {
        mem.set(rec.id, rec);
        return rec.id;
    },
    get(id) {
        return mem.get(id);
    },
};
