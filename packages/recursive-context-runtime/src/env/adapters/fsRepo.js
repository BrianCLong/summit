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
exports.FSRepoAdapter = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
class FSRepoAdapter {
    rootPath;
    handleId;
    constructor(rootPath, handleId) {
        this.rootPath = rootPath;
        this.handleId = handleId;
    }
    async listFiles(prefix) {
        const searchPath = prefix ? path.join(this.rootPath, prefix) : this.rootPath;
        // Recursive list (simplified for MVP)
        const files = [];
        const scan = async (dir) => {
            const entries = await fs.readdir(dir, { withFileTypes: true });
            for (const entry of entries) {
                const fullPath = path.join(dir, entry.name);
                const relPath = path.relative(this.rootPath, fullPath);
                if (entry.isDirectory()) {
                    if (entry.name !== '.git' && entry.name !== 'node_modules') {
                        await scan(fullPath);
                    }
                }
                else {
                    files.push(relPath);
                }
            }
        };
        await scan(searchPath);
        return files;
    }
    async readFile(filePath, start, end) {
        const resolvedRoot = path.resolve(this.rootPath);
        const resolvedPath = path.resolve(resolvedRoot, filePath);
        // Safety check: Ensure the resolved path starts with the root path + separator, or IS the root path
        if (!resolvedPath.startsWith(resolvedRoot + path.sep) && resolvedPath !== resolvedRoot) {
            throw new Error("Access denied: Path traversal attempt");
        }
        const content = await fs.readFile(resolvedPath, 'utf-8');
        const slice = (start !== undefined && end !== undefined)
            ? content.slice(start, end)
            : content;
        const sha256 = (0, crypto_1.createHash)('sha256').update(slice).digest('hex');
        return {
            text: slice,
            span: {
                handleId: this.handleId,
                path: filePath,
                start: start ?? 0,
                end: end ?? content.length,
                sha256
            }
        };
    }
    async searchText(pattern, opts) {
        // Basic implementation: iterate and match
        const hits = [];
        const files = opts?.paths ?? await this.listFiles();
        const maxHits = opts?.maxHits ?? 10;
        for (const f of files) {
            if (hits.length >= maxHits)
                break;
            try {
                const { text } = await this.readFile(f);
                const index = text.indexOf(pattern);
                if (index !== -1) {
                    // Create a snippet around the hit
                    const snippetStart = Math.max(0, index - 20);
                    const snippetEnd = Math.min(text.length, index + pattern.length + 20);
                    const snippet = text.slice(snippetStart, snippetEnd);
                    const sha256 = (0, crypto_1.createHash)('sha256').update(snippet).digest('hex');
                    hits.push({
                        hit: snippet,
                        span: {
                            handleId: this.handleId,
                            path: f,
                            start: snippetStart,
                            end: snippetEnd,
                            sha256
                        }
                    });
                }
            }
            catch (e) {
                // Ignore read errors during search
            }
        }
        return hits;
    }
    async peek(start, len) {
        throw new Error("peek() not supported on FSRepoAdapter (unstructured stream access not available)");
    }
    async chunk(strategy, opts) {
        throw new Error("chunk() not implemented in basic adapter");
    }
}
exports.FSRepoAdapter = FSRepoAdapter;
