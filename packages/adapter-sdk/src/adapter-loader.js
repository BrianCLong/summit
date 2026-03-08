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
exports.resolveEntry = resolveEntry;
exports.loadAdapterModule = loadAdapterModule;
// @ts-nocheck
const fs_extra_1 = __importDefault(require("fs-extra"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const SUPPORTED_EXTENSIONS = new Set(['.js', '.mjs', '.cjs']);
async function resolveEntry(entry) {
    const candidate = node_path_1.default.isAbsolute(entry)
        ? entry
        : node_path_1.default.join(process.cwd(), entry);
    const normalized = node_path_1.default.normalize(candidate);
    if (!(await fs_extra_1.default.pathExists(normalized))) {
        throw new Error(`Adapter entry not found at ${normalized}`);
    }
    const extension = node_path_1.default.extname(normalized);
    if (!SUPPORTED_EXTENSIONS.has(extension)) {
        throw new Error(`Unsupported adapter entry extension ${extension}. Build TypeScript before running the CLI.`);
    }
    return normalized;
}
async function loadAdapterModule(entry) {
    const resolvedEntry = await resolveEntry(entry);
    const moduleUrl = (0, node_url_1.pathToFileURL)(resolvedEntry).href;
    const imported = (await Promise.resolve(`${moduleUrl}`).then(s => __importStar(require(s))));
    const candidate = (imported.default ?? imported.adapter ?? imported);
    if (!candidate || typeof candidate !== 'object') {
        throw new Error('Adapter module did not export a runtime object.');
    }
    if (typeof candidate.handleEvent !== 'function') {
        throw new Error('Adapter module is missing a handleEvent implementation.');
    }
    if (!candidate.metadata) {
        throw new Error('Adapter module is missing required metadata.');
    }
    return candidate;
}
