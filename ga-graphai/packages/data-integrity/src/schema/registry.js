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
exports.SchemaRegistry = void 0;
exports.versionFromFilename = versionFromFilename;
const promises_1 = require("node:fs/promises");
const node_path_1 = require("node:path");
const rules_js_1 = require("./rules.js");
function sortVersion(a, b) {
    const normalize = (value) => value.replace(/^v/, '');
    return Number.parseInt(normalize(a), 10) - Number.parseInt(normalize(b), 10);
}
class SchemaRegistry {
    definitions = new Map();
    register(definition) {
        if (!this.definitions.has(definition.name)) {
            this.definitions.set(definition.name, new Map());
        }
        this.definitions.get(definition.name).set(definition.version, definition);
    }
    get(schema, version) {
        return this.definitions.get(schema)?.get(version);
    }
    list(schema) {
        return Array.from(this.definitions.get(schema)?.values() ?? []).sort((a, b) => sortVersion(a.version, b.version));
    }
    schemas() {
        return Array.from(this.definitions.keys()).sort();
    }
    latest(schema) {
        const versions = this.list(schema);
        return versions.at(-1);
    }
    previous(schema) {
        const versions = this.list(schema);
        return versions.length > 1 ? versions[versions.length - 2] : undefined;
    }
    checkLatest() {
        const reports = [];
        for (const schema of this.schemas()) {
            const current = this.latest(schema);
            const prior = this.previous(schema);
            if (current && prior) {
                reports.push((0, rules_js_1.compareSchemas)(prior, current));
            }
        }
        return reports;
    }
    static async fromDirectory(schemaDir) {
        const fs = await Promise.resolve().then(() => __importStar(require('node:fs/promises')));
        const entries = await fs.readdir(schemaDir);
        const registry = new SchemaRegistry();
        for (const entry of entries) {
            if ((0, node_path_1.extname)(entry) !== '.json') {
                continue;
            }
            const contents = await (0, promises_1.readFile)((0, node_path_1.join)(schemaDir, entry), 'utf8');
            const definition = JSON.parse(contents);
            if (!definition.name || !definition.version || !definition.fields) {
                throw new Error(`Invalid schema definition in ${entry}`);
            }
            registry.register(definition);
        }
        return registry;
    }
    static fromDefinitions(definitions) {
        const registry = new SchemaRegistry();
        definitions.forEach((definition) => registry.register(definition));
        return registry;
    }
}
exports.SchemaRegistry = SchemaRegistry;
function versionFromFilename(filename) {
    const base = (0, node_path_1.basename)(filename, (0, node_path_1.extname)(filename));
    const parts = base.split('.');
    return parts.at(-1) ?? base;
}
