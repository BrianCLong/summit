"use strict";
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
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.canonicalJson = canonicalJson;
exports.planFingerprint = planFingerprint;
const crypto = __importStar(require("crypto"));
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
const CANON_KEYS = new Set(['operatorType', 'planner', 'arguments', 'details', 'identifiers']);
const IGNORED_KEYS = new Set(['rows', 'dbHits', 'pageCacheHits', 'pageCacheMisses', 'time', 'rowsIn', 'rowsOut']);
// Helper to strip dynamic execution stats from a plan to create a canonical shape.
function _stripDynamic(node) {
    if (node === null || typeof node !== 'object') {
        return node;
    }
    // Handle arrays (e.g. children list) by mapping
    if (Array.isArray(node)) {
        return node.map((item) => _stripDynamic(item));
    }
    // Handle objects (plan nodes OR property objects like arguments)
    const kept = {};
    // Heuristic: A plan node has 'operatorType'.
    // If it's a plan node, we apply strict filtering (allowlist CANON_KEYS + structure).
    // If it's just a value object (like arguments), we keep all keys (but still strip IGNORED_KEYS).
    const isPlanNode = 'operatorType' in node;
    for (const [key, value] of Object.entries(node)) {
        if (IGNORED_KEYS.has(key))
            continue;
        let shouldKeep = true;
        if (isPlanNode) {
            const isCanon = CANON_KEYS.has(key);
            const isStructure = typeof value === 'object' && value !== null;
            shouldKeep = isCanon || isStructure;
        }
        if (shouldKeep) {
            kept[key] = _stripDynamic(value);
        }
    }
    // Deterministic child ordering based on operatorType and arguments
    // Only applies if 'children' exists and is an array (Plan Node property)
    if (Array.isArray(kept.children)) {
        kept.children.sort((a, b) => {
            const opA = a.operatorType || '';
            const opB = b.operatorType || '';
            if (opA < opB)
                return -1;
            if (opA > opB)
                return 1;
            // Secondary sort: canonical json string of arguments
            const argsA = (0, fast_json_stable_stringify_1.default)(a.arguments || {});
            const argsB = (0, fast_json_stable_stringify_1.default)(b.arguments || {});
            if (argsA < argsB)
                return -1;
            if (argsA > argsB)
                return 1;
            return 0;
        });
    }
    return kept;
}
/**
 * Returns a canonical JSON string for a plan, stripping runtime stats.
 */
function canonicalJson(planJson) {
    const canon = _stripDynamic(planJson);
    // stringify sorts object keys deterministically
    return (0, fast_json_stable_stringify_1.default)(canon);
}
/**
 * Returns a SHA256 fingerprint of the canonical plan.
 */
function planFingerprint(planJson) {
    const cj = canonicalJson(planJson);
    return crypto.createHash('sha256').update(cj).digest('hex');
}
