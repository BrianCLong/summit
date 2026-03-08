#!/usr/bin/env node
"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_url_1 = require("node:url");
const InfluenceNetworkExtractor_js_1 = require("./InfluenceNetworkExtractor.js");
function parseArgs(argv) {
    const args = {};
    for (let i = 0; i < argv.length; i += 1) {
        const part = argv[i];
        if (part.startsWith('--')) {
            const key = part.slice(2);
            const value = argv[i + 1];
            if (!value || value.startsWith('--')) {
                throw new Error(`Missing value for --${key}`);
            }
            args[key] = value;
            i += 1;
        }
    }
    const input = args.input ?? args.i;
    const output = args.output ?? args.o;
    if (!input || !output) {
        throw new Error('Usage: npm run extract -- --input <file> --output <file>');
    }
    return { input, output };
}
const packageRoot = node_path_1.default.resolve(node_path_1.default.dirname((0, node_url_1.fileURLToPath)(import.meta.url)), '..');
const repoRoot = node_path_1.default.resolve(packageRoot, '..', '..');
function resolveInputPath(filePath) {
    const candidates = [
        node_path_1.default.resolve(process.cwd(), filePath),
        node_path_1.default.resolve(packageRoot, filePath),
        node_path_1.default.resolve(repoRoot, filePath),
    ];
    for (const candidate of candidates) {
        if (node_fs_1.default.existsSync(candidate)) {
            return candidate;
        }
    }
    return candidates[0];
}
function loadSourceData(filePath) {
    const resolved = resolveInputPath(filePath);
    if (!node_fs_1.default.existsSync(resolved)) {
        throw new Error(`Input file not found: ${resolved}`);
    }
    const ext = node_path_1.default.extname(resolved).toLowerCase();
    if (ext === '.json') {
        const raw = node_fs_1.default.readFileSync(resolved, 'utf-8');
        const parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) {
            return [{ kind: 'social', posts: parsed }];
        }
        if (parsed.kind) {
            return [parsed];
        }
        if (parsed.posts || parsed.documents) {
            const sources = [];
            if (parsed.posts) {
                sources.push({ kind: 'social', posts: parsed.posts });
            }
            if (parsed.documents) {
                sources.push({ kind: 'text', documents: parsed.documents });
            }
            return sources;
        }
        throw new Error('Unsupported JSON structure for input data');
    }
    if (ext === '.csv') {
        const raw = node_fs_1.default.readFileSync(resolved, 'utf-8');
        const [header, ...rows] = raw.split(/\r?\n/).filter(Boolean);
        const columns = header.split(',').map((col) => col.trim());
        const posts = rows.map((row, index) => {
            const values = row.split(',').map((value) => value.trim());
            const record = {};
            columns.forEach((col, colIndex) => {
                record[col] = values[colIndex] ?? '';
            });
            return {
                id: record.id ?? `row-${index}`,
                author: record.author ?? 'unknown',
                text: record.text ?? '',
                timestamp: record.timestamp ?? new Date().toISOString(),
                inReplyTo: record.inReplyTo || undefined,
                sharedFrom: record.sharedFrom || undefined,
            };
        });
        return [{ kind: 'social', posts }];
    }
    throw new Error(`Unsupported input format: ${ext}`);
}
function main() {
    try {
        const args = parseArgs(process.argv.slice(2));
        const sources = loadSourceData(args.input);
        const extractor = new InfluenceNetworkExtractor_js_1.InfluenceNetworkExtractor();
        const network = extractor.extract(sources);
        const enriched = extractor.enrich(network);
        const ranked = extractor.rankNodes(enriched);
        const output = { ...enriched, rankings: ranked.rankings };
        node_fs_1.default.writeFileSync(node_path_1.default.resolve(args.output), JSON.stringify(output, null, 2));
        // eslint-disable-next-line no-console
        console.log(`Wrote influence network to ${node_path_1.default.resolve(args.output)}`);
    }
    catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        // eslint-disable-next-line no-console
        console.error(message);
        process.exitCode = 1;
    }
}
main();
