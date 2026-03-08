"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createStreamingExport = createStreamingExport;
exports.verifyImportWithCheckpoint = verifyImportWithCheckpoint;
exports.computeHashForBuffer = computeHashForBuffer;
exports.compareExportOutputs = compareExportOutputs;
const fs_1 = require("fs");
const promises_1 = require("stream/promises");
const stream_1 = require("stream");
const crypto_1 = require("crypto");
const path_1 = require("path");
const jszip_1 = __importDefault(require("jszip"));
const json_stable_stringify_1 = __importDefault(require("json-stable-stringify"));
const exporter_1 = require("./exporter");
const redact_1 = require("./redact");
const pdf_1 = require("./pdf");
const utils_1 = require("./utils");
const fixedDate = new Date('2000-01-01T00:00:00Z');
async function ensureDir(filePath) {
    await fs_1.promises.mkdir((0, path_1.dirname)(filePath), { recursive: true });
}
async function writeCheckpoint(path, state) {
    await ensureDir(path);
    await fs_1.promises.writeFile(path, JSON.stringify(state, null, 2), 'utf-8');
}
async function readCheckpoint(path) {
    try {
        const raw = await fs_1.promises.readFile(path, 'utf-8');
        return JSON.parse(raw);
    }
    catch {
        return null;
    }
}
async function hashFile(filePath) {
    const hash = (0, crypto_1.createHash)('sha256');
    await (0, promises_1.pipeline)((0, fs_1.createReadStream)(filePath), async function* (source) {
        for await (const chunk of source) {
            hash.update(chunk);
            yield chunk;
        }
    });
    return hash.digest('hex');
}
async function streamWithCheckpoint(source, options) {
    const { outputPath, checkpointPath, totalBytes, stage, signal, } = options;
    const chunkHashes = [];
    const checkpoint = await readCheckpoint(checkpointPath);
    const existingSize = await fs_1.promises
        .stat(outputPath)
        .then((stat) => stat.size)
        .catch(() => 0);
    const resumeOffset = Math.min(checkpoint?.bytesProcessed ?? 0, existingSize);
    const hash = (0, crypto_1.createHash)('sha256');
    let processed = 0;
    const chunkSize = options.chunkSize ?? 1024 * 1024;
    let buffer = Buffer.alloc(0);
    await ensureDir(outputPath);
    await fs_1.promises.writeFile(outputPath, '', { flag: 'a' });
    await fs_1.promises.truncate(outputPath, resumeOffset);
    const writer = (0, fs_1.createWriteStream)(outputPath, {
        flags: 'a',
        start: resumeOffset,
    });
    const processSlice = async (slice) => {
        const chunkHash = (0, crypto_1.createHash)('sha256').update(slice).digest('hex');
        chunkHashes.push(chunkHash);
        const previousProcessed = processed;
        processed += slice.length;
        hash.update(slice);
        let writable = slice;
        if (processed <= resumeOffset) {
            writable = null;
        }
        else if (previousProcessed < resumeOffset) {
            const alreadyWritten = resumeOffset - previousProcessed;
            writable = slice.slice(alreadyWritten);
        }
        await writeCheckpoint(checkpointPath, {
            bytesProcessed: processed,
            chunkHashes,
        });
        const progress = {
            stage,
            bytesProcessed: processed,
            totalBytes,
            percent: totalBytes && totalBytes > 0
                ? Math.min(100, Number(((processed / totalBytes) * 100).toFixed(2)))
                : undefined,
        };
        if (options.onProgress)
            options.onProgress(progress);
        if (writable && writable.length > 0) {
            return writable;
        }
        return null;
    };
    const chunker = new stream_1.Transform({
        transform(chunk, _enc, cb) {
            const run = async () => {
                buffer = Buffer.concat([buffer, chunk]);
                while (buffer.length >= chunkSize) {
                    const slice = buffer.subarray(0, chunkSize);
                    buffer = buffer.subarray(chunkSize);
                    const writable = await processSlice(slice);
                    if (writable)
                        this.push(writable);
                }
            };
            run().then(() => cb(), cb);
        },
        flush(cb) {
            const run = async () => {
                if (buffer.length > 0) {
                    const writable = await processSlice(buffer);
                    if (writable)
                        this.push(writable);
                }
            };
            run().then(() => cb(), cb);
        },
    });
    await (0, promises_1.pipeline)(source, chunker, writer, { signal });
    const digest = hash.digest('hex');
    await writeCheckpoint(checkpointPath, {
        bytesProcessed: processed,
        chunkHashes,
        completed: true,
        hash: digest,
    });
    return { hash: digest, chunkHashes, bytesProcessed: processed };
}
async function buildFiles(req) {
    const files = [];
    const redactionLog = [];
    const entities = (0, redact_1.applyRedactions)(req.entities, req.redactRules, redactionLog);
    const edges = (0, redact_1.applyRedactions)(req.edges, req.redactRules, redactionLog);
    if (req.format.includes('json')) {
        const entStr = (0, json_stable_stringify_1.default)((0, utils_1.sortObject)(entities));
        files.push({ path: 'data/entities.json', content: Buffer.from(entStr) });
        const edgeStr = (0, json_stable_stringify_1.default)((0, utils_1.sortObject)(edges));
        files.push({ path: 'data/edges.json', content: Buffer.from(edgeStr) });
    }
    if (req.format.includes('csv')) {
        const toCsv = (data) => {
            if (data.length === 0)
                return '';
            const headers = Array.from(new Set(data.flatMap((d) => Object.keys(d)))).sort();
            const escape = (val) => {
                const str = val == null ? '' : String(val);
                if (/[",\n]/.test(str)) {
                    return `"${str.replace(/"/g, '""')}"`;
                }
                return str;
            };
            const rows = data
                .map((row) => headers.map((h) => escape(row[h])))
                .map((r) => r.join(','));
            return [headers.join(','), ...rows].join('\n');
        };
        files.push({
            path: 'data/entities.csv',
            content: Buffer.from(toCsv(entities)),
        });
        files.push({
            path: 'data/edges.csv',
            content: Buffer.from(toCsv(edges)),
        });
    }
    if (req.format.includes('pdf')) {
        // PDF creation is already streaming-safe inside createPdf
        files.push({
            path: 'figures/graph.pdf',
            content: await (0, pdf_1.createPdf)(entities.length, edges.length),
        });
    }
    if (redactionLog.length) {
        files.push({
            path: 'redaction.log',
            content: Buffer.from(redactionLog.join('\n')),
        });
    }
    const manifestEntries = files.map((f) => ({
        path: f.path,
        sha256: (0, utils_1.sha256)(f.content),
        uuid: (0, exporter_1.uuidV5ForPath)(f.path),
    }));
    const manifest = {
        generatedAt: fixedDate.toISOString(),
        chainOfCustody: [{ event: 'export', timestamp: fixedDate.toISOString() }],
        files: manifestEntries.sort((a, b) => a.path.localeCompare(b.path)),
    };
    files.push({
        path: 'manifest.json',
        content: Buffer.from((0, json_stable_stringify_1.default)(manifest)),
    });
    return { files: files.sort((a, b) => a.path.localeCompare(b.path)), manifest };
}
async function createStreamingExport(req, options) {
    const { files, manifest } = await buildFiles(req);
    const zip = new jszip_1.default();
    for (const file of files) {
        zip.file(file.path, file.content, { date: fixedDate });
    }
    const zipStream = zip.generateNodeStream({
        type: 'nodebuffer',
        compression: 'DEFLATE',
        compressionOptions: { level: 9 },
    });
    const totalBytes = files.reduce((sum, file) => sum + file.content.length, 0);
    const result = await streamWithCheckpoint(zipStream, {
        outputPath: options.outputPath,
        checkpointPath: options.checkpointPath,
        chunkSize: options.chunkSize,
        totalBytes,
        stage: 'export',
        signal: options.signal,
        onProgress: options.onProgress,
    });
    return {
        outputPath: options.outputPath,
        hash: result.hash,
        manifest,
    };
}
async function verifyImportWithCheckpoint(filePath, checkpointPath, options) {
    const totalBytes = (await fs_1.promises.stat(filePath)).size;
    const chunkHashes = [];
    const hash = (0, crypto_1.createHash)('sha256');
    const checkpoint = await readCheckpoint(checkpointPath);
    if (checkpoint?.completed && checkpoint.hash) {
        return { hash: checkpoint.hash, chunkHashes: checkpoint.chunkHashes };
    }
    const sink = new stream_1.Writable({
        write(_chunk, _enc, cb) {
            cb();
        },
    });
    let processed = 0;
    const chunkSize = options?.chunkSize ?? 1024 * 1024;
    let buffer = Buffer.alloc(0);
    const tracker = new stream_1.Transform({
        transform(chunk, _enc, cb) {
            const run = async () => {
                buffer = Buffer.concat([buffer, chunk]);
                while (buffer.length >= chunkSize) {
                    const slice = buffer.subarray(0, chunkSize);
                    buffer = buffer.subarray(chunkSize);
                    processed += slice.length;
                    const digest = (0, crypto_1.createHash)('sha256').update(slice).digest('hex');
                    chunkHashes.push(digest);
                    hash.update(slice);
                    const progress = {
                        stage: 'import',
                        bytesProcessed: processed,
                        totalBytes,
                        percent: Number(((processed / totalBytes) * 100).toFixed(2)),
                    };
                    if (options?.onProgress)
                        options.onProgress(progress);
                    await writeCheckpoint(checkpointPath, {
                        bytesProcessed: processed,
                        chunkHashes,
                    });
                }
            };
            run().then(() => cb(null, null), cb);
        },
        flush(cb) {
            const run = async () => {
                if (buffer.length > 0) {
                    processed += buffer.length;
                    const digest = (0, crypto_1.createHash)('sha256').update(buffer).digest('hex');
                    chunkHashes.push(digest);
                    hash.update(buffer);
                    await writeCheckpoint(checkpointPath, {
                        bytesProcessed: processed,
                        chunkHashes,
                    });
                }
            };
            run().then(() => cb(), cb);
        },
    });
    const reader = (0, fs_1.createReadStream)(filePath);
    await (0, promises_1.pipeline)(reader, tracker, sink, { signal: options?.signal });
    const finalHash = hash.digest('hex');
    await writeCheckpoint(checkpointPath, {
        bytesProcessed: processed,
        chunkHashes,
        completed: true,
        hash: finalHash,
    });
    return { hash: finalHash, chunkHashes };
}
async function computeHashForBuffer(buffer) {
    const hash = (0, crypto_1.createHash)('sha256');
    hash.update(buffer);
    return hash.digest('hex');
}
async function compareExportOutputs(reference, streamedFilePath) {
    const referenceHash = await computeHashForBuffer(reference);
    const streamedHash = await hashFile(streamedFilePath);
    return referenceHash === streamedHash;
}
