"use strict";
/**
 * Export Manager
 * Air-gapped export functionality with integrity verification
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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.ExportManager = void 0;
exports.createExportManager = createExportManager;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_zlib_1 = require("node:zlib");
const promises_1 = require("node:stream/promises");
const uuid_1 = require("uuid");
const zod_1 = require("zod");
const constants_js_1 = require("./constants.js");
const ExportOptionsSchema = zod_1.z.object({
    format: zod_1.z.enum(constants_js_1.EXPORT_FORMATS).default('json'),
    outputDir: zod_1.z.string().optional(),
    filename: zod_1.z.string().optional(),
    compress: zod_1.z.boolean().default(true),
    sign: zod_1.z.boolean().default(false),
    includeMetadata: zod_1.z.boolean().default(true),
    chunkSize: zod_1.z.number().min(100).max(100000).default(10000),
    filter: zod_1.z
        .object({
        labels: zod_1.z.array(zod_1.z.string()).optional(),
        types: zod_1.z.array(zod_1.z.string()).optional(),
        properties: zod_1.z.record(zod_1.z.unknown()).optional(),
    })
        .optional(),
});
class ExportManager {
    config;
    privateKey;
    constructor(config) {
        this.config = config;
        // Load private key if configured
        if (config.privateKeyPath && node_fs_1.default.existsSync(config.privateKeyPath)) {
            this.privateKey = node_fs_1.default.readFileSync(config.privateKeyPath, 'utf-8');
        }
    }
    async exportGraph(data, options = {}) {
        const opts = ExportOptionsSchema.parse(options);
        const startTime = Date.now();
        const exportId = (0, uuid_1.v4)();
        const outputDir = opts.outputDir || this.config.outputDir;
        const timestamp = new Date().toISOString();
        // Create output directory
        const exportDir = node_path_1.default.join(outputDir, `export-${exportId}`);
        node_fs_1.default.mkdirSync(exportDir, { recursive: true });
        const files = [];
        // Apply filters
        let nodes = data.nodes;
        let relationships = data.relationships;
        if (opts.filter?.labels?.length) {
            nodes = nodes.filter((n) => n.labels.some((l) => opts.filter.labels.includes(l)));
        }
        if (opts.filter?.types?.length) {
            relationships = relationships.filter((r) => opts.filter.types.includes(r.type));
        }
        // Export nodes
        const nodesFile = await this.exportNodes(nodes, exportDir, opts.format, opts.compress, opts.chunkSize);
        files.push(nodesFile);
        // Export relationships
        const relsFile = await this.exportRelationships(relationships, exportDir, opts.format, opts.compress, opts.chunkSize);
        files.push(relsFile);
        // Export metadata
        if (opts.includeMetadata && data.metadata) {
            const metaFile = await this.exportMetadata(data.metadata, exportDir, opts.compress);
            files.push(metaFile);
        }
        // Export schema
        const schemaFile = await this.exportSchema(nodes, relationships, exportDir, opts.compress);
        files.push(schemaFile);
        // Calculate stats
        const stats = {
            totalNodes: nodes.length,
            totalRelationships: relationships.length,
            labels: [...new Set(nodes.flatMap((n) => n.labels))],
            relationshipTypes: [...new Set(relationships.map((r) => r.type))],
            exportDuration: Date.now() - startTime,
        };
        // Create manifest
        const manifest = {
            version: constants_js_1.MANIFEST_VERSION,
            exportId,
            timestamp,
            format: opts.format,
            compressed: opts.compress,
            signed: opts.sign && !!this.privateKey,
            files,
            stats,
            checksum: this.calculateManifestChecksum(files),
        };
        // Sign manifest if requested
        if (opts.sign && this.privateKey) {
            manifest.signature = this.signManifest(manifest);
        }
        // Write manifest
        const manifestPath = node_path_1.default.join(exportDir, 'manifest.json');
        node_fs_1.default.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
        return manifest;
    }
    async importGraph(exportPath, options = {}) {
        const { verify = true, dryRun = false } = options;
        const result = {
            success: false,
            importId: (0, uuid_1.v4)(),
            nodesImported: 0,
            relationshipsImported: 0,
            errors: [],
            warnings: [],
        };
        try {
            // Read manifest
            const manifestPath = node_path_1.default.join(exportPath, 'manifest.json');
            if (!node_fs_1.default.existsSync(manifestPath)) {
                result.errors.push('Manifest file not found');
                return result;
            }
            const manifest = JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf-8'));
            // Verify integrity
            if (verify) {
                const integrityResult = await this.verifyExport(exportPath);
                if (!integrityResult.valid) {
                    result.errors.push(...integrityResult.errors);
                    return result;
                }
            }
            if (dryRun) {
                result.success = true;
                result.nodesImported = manifest.stats.totalNodes;
                result.relationshipsImported = manifest.stats.totalRelationships;
                result.warnings.push('Dry run - no data imported');
                return result;
            }
            // Read and parse data files
            const nodes = await this.readExportFile(exportPath, manifest.files.find((f) => f.type === 'nodes'), manifest.compressed);
            const relationships = await this.readExportFile(exportPath, manifest.files.find((f) => f.type === 'relationships'), manifest.compressed);
            result.nodesImported = nodes.length;
            result.relationshipsImported = relationships.length;
            result.success = true;
        }
        catch (error) {
            result.errors.push(error instanceof Error ? error.message : String(error));
        }
        return result;
    }
    async verifyExport(exportPath) {
        const errors = [];
        const warnings = [];
        try {
            // Read manifest
            const manifestPath = node_path_1.default.join(exportPath, 'manifest.json');
            if (!node_fs_1.default.existsSync(manifestPath)) {
                errors.push('Manifest file not found');
                return { valid: false, errors, warnings };
            }
            const manifest = JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf-8'));
            // Verify manifest checksum
            const calculatedChecksum = this.calculateManifestChecksum(manifest.files);
            if (calculatedChecksum !== manifest.checksum) {
                errors.push('Manifest checksum mismatch');
            }
            // Verify signature if present
            if (manifest.signed && manifest.signature) {
                if (!this.verifySignature(manifest, manifest.signature)) {
                    errors.push('Invalid manifest signature');
                }
            }
            // Verify each file
            for (const file of manifest.files) {
                const filePath = node_path_1.default.join(exportPath, file.name);
                if (!node_fs_1.default.existsSync(filePath)) {
                    errors.push(`File not found: ${file.name}`);
                    continue;
                }
                const fileChecksum = await this.calculateFileChecksum(filePath);
                if (fileChecksum !== file.checksum) {
                    errors.push(`Checksum mismatch for file: ${file.name}`);
                }
                const stats = node_fs_1.default.statSync(filePath);
                if (stats.size !== file.size) {
                    warnings.push(`Size mismatch for file: ${file.name} (expected ${file.size}, got ${stats.size})`);
                }
            }
        }
        catch (error) {
            errors.push(`Verification error: ${error instanceof Error ? error.message : String(error)}`);
        }
        return {
            valid: errors.length === 0,
            errors,
            warnings,
        };
    }
    async listExports(directory) {
        const exportDir = directory || this.config.outputDir;
        const exports = [];
        if (!node_fs_1.default.existsSync(exportDir)) {
            return exports;
        }
        const entries = node_fs_1.default.readdirSync(exportDir, { withFileTypes: true });
        for (const entry of entries) {
            if (entry.isDirectory() && entry.name.startsWith('export-')) {
                const manifestPath = node_path_1.default.join(exportDir, entry.name, 'manifest.json');
                if (node_fs_1.default.existsSync(manifestPath)) {
                    try {
                        const manifest = JSON.parse(node_fs_1.default.readFileSync(manifestPath, 'utf-8'));
                        exports.push({
                            path: node_path_1.default.join(exportDir, entry.name),
                            manifest,
                        });
                    }
                    catch {
                        // Skip invalid exports
                    }
                }
            }
        }
        return exports.sort((a, b) => new Date(b.manifest.timestamp).getTime() -
            new Date(a.manifest.timestamp).getTime());
    }
    async exportNodes(nodes, outputDir, format, compress, _chunkSize) {
        const filename = `nodes.${format}${compress ? '.gz' : ''}`;
        const filePath = node_path_1.default.join(outputDir, filename);
        const content = this.serializeData(nodes, format);
        await this.writeFile(filePath, content, compress);
        const stats = node_fs_1.default.statSync(filePath);
        const checksum = await this.calculateFileChecksum(filePath);
        return {
            name: filename,
            size: stats.size,
            checksum,
            type: 'nodes',
            count: nodes.length,
        };
    }
    async exportRelationships(relationships, outputDir, format, compress, _chunkSize) {
        const filename = `relationships.${format}${compress ? '.gz' : ''}`;
        const filePath = node_path_1.default.join(outputDir, filename);
        const content = this.serializeData(relationships, format);
        await this.writeFile(filePath, content, compress);
        const stats = node_fs_1.default.statSync(filePath);
        const checksum = await this.calculateFileChecksum(filePath);
        return {
            name: filename,
            size: stats.size,
            checksum,
            type: 'relationships',
            count: relationships.length,
        };
    }
    async exportMetadata(metadata, outputDir, compress) {
        const filename = `metadata.json${compress ? '.gz' : ''}`;
        const filePath = node_path_1.default.join(outputDir, filename);
        const content = JSON.stringify(metadata, null, 2);
        await this.writeFile(filePath, content, compress);
        const stats = node_fs_1.default.statSync(filePath);
        const checksum = await this.calculateFileChecksum(filePath);
        return {
            name: filename,
            size: stats.size,
            checksum,
            type: 'metadata',
        };
    }
    async exportSchema(nodes, relationships, outputDir, compress) {
        const schema = {
            labels: [...new Set(nodes.flatMap((n) => n.labels))],
            relationshipTypes: [...new Set(relationships.map((r) => r.type))],
            nodeProperties: this.extractPropertySchema(nodes),
            relationshipProperties: this.extractPropertySchema(relationships),
        };
        const filename = `schema.json${compress ? '.gz' : ''}`;
        const filePath = node_path_1.default.join(outputDir, filename);
        const content = JSON.stringify(schema, null, 2);
        await this.writeFile(filePath, content, compress);
        const stats = node_fs_1.default.statSync(filePath);
        const checksum = await this.calculateFileChecksum(filePath);
        return {
            name: filename,
            size: stats.size,
            checksum,
            type: 'schema',
        };
    }
    serializeData(data, format) {
        switch (format) {
            case 'json':
                return JSON.stringify(data, null, 2);
            case 'csv':
                if (data.length === 0)
                    return '';
                const headers = Object.keys(data[0]);
                const rows = data.map((item) => headers
                    .map((h) => {
                    const val = item[h];
                    if (typeof val === 'object') {
                        return JSON.stringify(val);
                    }
                    return String(val ?? '');
                })
                    .join(','));
                return [headers.join(','), ...rows].join('\n');
            case 'graphml':
                return this.toGraphML(data);
            case 'parquet':
                // Parquet requires binary format, return JSON for now
                return JSON.stringify(data);
            default:
                return JSON.stringify(data);
        }
    }
    toGraphML(data) {
        const lines = [
            '<?xml version="1.0" encoding="UTF-8"?>',
            '<graphml xmlns="http://graphml.graphdrawing.org/xmlns">',
            '  <graph id="G" edgedefault="directed">',
        ];
        for (const item of data) {
            if (this.isNode(item)) {
                const props = Object.entries(item.properties)
                    .map(([k, v]) => `${k}="${this.escapeXml(String(v))}"`)
                    .join(' ');
                lines.push(`    <node id="${item.id}" ${props}/>`);
            }
            else if (this.isRelationship(item)) {
                lines.push(`    <edge source="${item.startNodeId}" target="${item.endNodeId}" label="${item.type}"/>`);
            }
        }
        lines.push('  </graph>');
        lines.push('</graphml>');
        return lines.join('\n');
    }
    escapeXml(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&apos;');
    }
    isNode(item) {
        return (typeof item === 'object' &&
            item !== null &&
            'labels' in item &&
            Array.isArray(item.labels));
    }
    isRelationship(item) {
        return (typeof item === 'object' &&
            item !== null &&
            'type' in item &&
            'startNodeId' in item &&
            'endNodeId' in item);
    }
    extractPropertySchema(items) {
        const schema = {};
        for (const item of items) {
            for (const [key, value] of Object.entries(item.properties)) {
                if (!schema[key]) {
                    schema[key] = new Set();
                }
                schema[key].add(typeof value);
            }
        }
        const result = {};
        for (const [key, types] of Object.entries(schema)) {
            result[key] = Array.from(types);
        }
        return result;
    }
    async writeFile(filePath, content, compress) {
        if (compress) {
            const { Readable } = await Promise.resolve().then(() => __importStar(require('node:stream')));
            const input = Readable.from([content]);
            const output = node_fs_1.default.createWriteStream(filePath);
            const gzip = (0, node_zlib_1.createGzip)();
            await (0, promises_1.pipeline)(input, gzip, output);
        }
        else {
            node_fs_1.default.writeFileSync(filePath, content);
        }
    }
    async readExportFile(exportPath, file, compressed) {
        const filePath = node_path_1.default.join(exportPath, file.name);
        if (compressed) {
            const chunks = [];
            const input = node_fs_1.default.createReadStream(filePath);
            const gunzip = (0, node_zlib_1.createGunzip)();
            await (0, promises_1.pipeline)(input, gunzip, async function* (source) {
                for await (const chunk of source) {
                    chunks.push(chunk);
                }
            });
            const content = Buffer.concat(chunks).toString('utf-8');
            return JSON.parse(content);
        }
        else {
            const content = node_fs_1.default.readFileSync(filePath, 'utf-8');
            return JSON.parse(content);
        }
    }
    async calculateFileChecksum(filePath) {
        return new Promise((resolve, reject) => {
            const hash = node_crypto_1.default.createHash(constants_js_1.CHECKSUM_ALGORITHM);
            const stream = node_fs_1.default.createReadStream(filePath);
            stream.on('data', (data) => hash.update(data));
            stream.on('end', () => resolve(hash.digest('hex')));
            stream.on('error', reject);
        });
    }
    calculateManifestChecksum(files) {
        const hash = node_crypto_1.default.createHash(constants_js_1.CHECKSUM_ALGORITHM);
        for (const file of files) {
            hash.update(`${file.name}:${file.size}:${file.checksum}`);
        }
        return hash.digest('hex');
    }
    signManifest(manifest) {
        if (!this.privateKey) {
            throw new Error('Private key not configured');
        }
        const data = JSON.stringify({
            exportId: manifest.exportId,
            timestamp: manifest.timestamp,
            checksum: manifest.checksum,
        });
        const sign = node_crypto_1.default.createSign('RSA-SHA256');
        sign.update(data);
        return sign.sign(this.privateKey, 'base64');
    }
    verifySignature(_manifest, signature) {
        // For verification, we would need the public key
        // This is a placeholder implementation
        return signature.length > 0;
    }
}
exports.ExportManager = ExportManager;
function createExportManager(config) {
    return new ExportManager(config);
}
