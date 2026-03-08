"use strict";
/**
 * Summit Work Graph - FileSystem Graph Store
 *
 * "Artifact-first" persistence for Summit Tickets.
 * Stores Tickets as folders with `ticket.json` (eventually yaml) and evidence.
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
exports.FileSystemGraphStore = void 0;
const fs = __importStar(require("fs/promises"));
const path = __importStar(require("path"));
function validateId(id) {
    if (!/^[a-zA-Z0-9_-]+$/.test(id)) {
        throw new Error(`Invalid ID format: ${id}. Only alphanumeric, dashes, and underscores allowed.`);
    }
}
function jsonReviver(key, value) {
    // ISO 8601 date format detection
    if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?Z$/.test(value)) {
        return new Date(value);
    }
    return value;
}
class FileSystemGraphStore {
    rootDir;
    constructor(rootDir) {
        this.rootDir = rootDir;
    }
    async init() {
        await fs.mkdir(this.rootDir, { recursive: true });
        await fs.mkdir(path.join(this.rootDir, 'tickets'), { recursive: true });
        await fs.mkdir(path.join(this.rootDir, 'artifacts'), { recursive: true });
        await fs.mkdir(path.join(this.rootDir, 'nodes'), { recursive: true });
        await fs.mkdir(path.join(this.rootDir, 'edges'), { recursive: true });
    }
    // ============================================
    // Node Operations
    // ============================================
    async createNode(node) {
        await this.init(); // Ensure dirs exist
        validateId(node.id);
        if (node.type === 'ticket') {
            const ticketDir = path.join(this.rootDir, 'tickets', node.id);
            await fs.mkdir(ticketDir, { recursive: true });
            await fs.writeFile(path.join(ticketDir, 'ticket.json'), JSON.stringify(node, null, 2));
            await fs.mkdir(path.join(ticketDir, 'evidence'), { recursive: true });
            // Initialize logs
            await fs.writeFile(path.join(ticketDir, 'provenance.jsonl'), '');
            await fs.writeFile(path.join(ticketDir, 'decision_log.md'), '# Decision Log\n\n');
        }
        else if (node.type === 'evidence_bundle') {
            await fs.writeFile(path.join(this.rootDir, 'artifacts', `${node.id}.json`), JSON.stringify(node, null, 2));
        }
        else {
            await fs.writeFile(path.join(this.rootDir, 'nodes', `${node.id}.json`), JSON.stringify(node, null, 2));
        }
        return node;
    }
    async getNode(id) {
        validateId(id);
        // Try ticket
        try {
            const content = await fs.readFile(path.join(this.rootDir, 'tickets', id, 'ticket.json'), 'utf-8');
            return JSON.parse(content, jsonReviver);
        }
        catch (e) {
            // Ignore
        }
        // Try evidence bundle
        try {
            const content = await fs.readFile(path.join(this.rootDir, 'artifacts', `${id}.json`), 'utf-8');
            return JSON.parse(content, jsonReviver);
        }
        catch (e) {
            // Ignore
        }
        // Try generic node
        try {
            const content = await fs.readFile(path.join(this.rootDir, 'nodes', `${id}.json`), 'utf-8');
            return JSON.parse(content, jsonReviver);
        }
        catch (e) {
            // Ignore
        }
        return null;
    }
    async getNodes(filter) {
        const nodes = [];
        // Helper to read all json files in a dir
        const readDir = async (dir) => {
            try {
                const files = await fs.readdir(dir);
                for (const file of files) {
                    if (file.endsWith('.json')) {
                        const content = await fs.readFile(path.join(dir, file), 'utf-8');
                        nodes.push(JSON.parse(content, jsonReviver));
                    }
                }
            }
            catch (e) {
                // Ignore if dir missing
            }
        };
        // Read nodes
        await readDir(path.join(this.rootDir, 'nodes'));
        await readDir(path.join(this.rootDir, 'artifacts'));
        // Read tickets
        try {
            const ticketDirs = await fs.readdir(path.join(this.rootDir, 'tickets'));
            for (const ticketId of ticketDirs) {
                try {
                    const content = await fs.readFile(path.join(this.rootDir, 'tickets', ticketId, 'ticket.json'), 'utf-8');
                    nodes.push(JSON.parse(content, jsonReviver));
                }
                catch (e) {
                    // ignore
                }
            }
        }
        catch (e) {
            // ignore
        }
        if (!filter)
            return nodes;
        return nodes.filter((node) => {
            for (const [key, value] of Object.entries(filter)) {
                if (node[key] !== value)
                    return false;
            }
            return true;
        });
    }
    async updateNode(id, updates) {
        validateId(id);
        const node = await this.getNode(id);
        if (!node)
            return null;
        const updated = { ...node, ...updates, updatedAt: new Date() };
        await this.createNode(updated); // Overwrite
        return updated;
    }
    async deleteNode(id) {
        validateId(id);
        const node = await this.getNode(id);
        if (!node)
            return false;
        if (node.type === 'ticket') {
            await fs.rm(path.join(this.rootDir, 'tickets', id), { recursive: true, force: true });
        }
        else if (node.type === 'evidence_bundle') {
            await fs.rm(path.join(this.rootDir, 'artifacts', `${id}.json`));
        }
        else {
            await fs.rm(path.join(this.rootDir, 'nodes', `${id}.json`));
        }
        return true;
    }
    // ============================================
    // Edge Operations
    // ============================================
    async createEdge(edge) {
        await this.init();
        validateId(edge.id);
        await fs.writeFile(path.join(this.rootDir, 'edges', `${edge.id}.json`), JSON.stringify(edge, null, 2));
        return edge;
    }
    async getEdges(filter) {
        const edges = [];
        try {
            const files = await fs.readdir(path.join(this.rootDir, 'edges'));
            for (const file of files) {
                if (file.endsWith('.json')) {
                    const content = await fs.readFile(path.join(this.rootDir, 'edges', file), 'utf-8');
                    edges.push(JSON.parse(content, jsonReviver));
                }
            }
        }
        catch (e) {
            // ignore
        }
        if (!filter)
            return edges;
        return edges.filter((edge) => {
            if (filter.sourceId && edge.sourceId !== filter.sourceId)
                return false;
            if (filter.targetId && edge.targetId !== filter.targetId)
                return false;
            if (filter.type && edge.type !== filter.type)
                return false;
            return true;
        });
    }
    async deleteEdge(id) {
        validateId(id);
        try {
            await fs.rm(path.join(this.rootDir, 'edges', `${id}.json`));
            return true;
        }
        catch (e) {
            return false;
        }
    }
}
exports.FileSystemGraphStore = FileSystemGraphStore;
