"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.query = query;
function query(q, cfg) {
    return cfg.active === 'new' ? milvus.search(q) : pgvector.search(q);
}
