"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isRevoked = void 0;
const store_js_1 = require("./store.js");
const isRevoked = (id, revokedAt) => {
    const cached = (0, store_js_1.getRevocation)(id);
    if (cached)
        return true;
    if (revokedAt) {
        (0, store_js_1.cacheRevocation)(id, revokedAt);
        return true;
    }
    return false;
};
exports.isRevoked = isRevoked;
