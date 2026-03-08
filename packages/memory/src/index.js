"use strict";
/**
 * @fileoverview Graph-backed memory system for Strands Agents
 * @module @intelgraph/strands-agents/memory
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MemoryStore = void 0;
__exportStar(require("./redactor.js"), exports);
class MemoryStore {
    store = new Map();
    add(entry) {
        this.store.set(entry.id, entry);
    }
    get(id) {
        return this.store.get(id);
    }
    search(query) {
        return Array.from(this.store.values()).filter(e => e.content.includes(query));
    }
}
exports.MemoryStore = MemoryStore;
