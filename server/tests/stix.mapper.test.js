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
Object.defineProperty(exports, "__esModule", { value: true });
const mapper_js_1 = require("../src/connectors/stix/mapper.js");
const neo = __importStar(require("../src/graph/neo4j.js"));
const globals_1 = require("@jest/globals");
(0, globals_1.test)('maps indicator + relationship', async () => {
    const runs = [];
    globals_1.jest.spyOn(neo, 'runCypher').mockImplementation(async (c, p) => {
        runs.push({ c, p });
        return [];
    });
    await (0, mapper_js_1.upsertStixBundle)([
        {
            type: 'indicator',
            id: 'indicator--1',
            name: 'Suspicious IP',
            pattern: "[ipv4-addr:value = '1.2.3.4']",
        },
        { type: 'malware', id: 'malware--1', name: 'EvilWare' },
        {
            type: 'relationship',
            id: 'rel--1',
            source_ref: 'indicator--1',
            target_ref: 'malware--1',
            relationship_type: 'indicates',
        },
    ], 'taxii:example');
    (0, globals_1.expect)(runs.some((r) => /MERGE \(e:Entity {stixId:\$id}\)/.test(r.c))).toBe(true);
    (0, globals_1.expect)(runs.some((r) => /MERGE \(a\)-\[r:RELATED_TO/.test(r.c))).toBe(true);
});
