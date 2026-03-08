"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.hashFile = hashFile;
exports.buildMediaEvidence = buildMediaEvidence;
exports.writeEvidenceArtifacts = writeEvidenceArtifacts;
const node_crypto_1 = __importDefault(require("node:crypto"));
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const MAX_SCAN_BYTES = 2 * 1024 * 1024;
const SCHEMA_VERSION = '1.0.0';
const MIME_BY_EXTENSION = {
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.svg': 'image/svg+xml',
    '.tif': 'image/tiff',
    '.tiff': 'image/tiff',
    '.mp4': 'video/mp4',
    '.mov': 'video/quicktime',
    '.webm': 'video/webm',
    '.mkv': 'video/x-matroska',
};
const CONTAINER_BY_EXTENSION = {
    '.png': 'png',
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.gif': 'gif',
    '.webp': 'webp',
    '.svg': 'svg',
    '.tif': 'tiff',
    '.tiff': 'tiff',
    '.mp4': 'mp4',
    '.mov': 'quicktime',
    '.webm': 'webm',
    '.mkv': 'matroska',
};
const CODEC_BY_EXTENSION = {
    '.png': 'png',
    '.jpg': 'jpeg',
    '.jpeg': 'jpeg',
    '.gif': 'gif',
    '.webp': 'webp',
    '.svg': 'svg',
    '.tif': 'tiff',
    '.tiff': 'tiff',
};
const C2PA_MARKERS = [
    'c2pa',
    'urn:c2pa',
    'contentcredentials',
    'content credentials',
    'jumbf',
    'c2pa.manifest',
];
function detectContainerDetail(buffer) {
    if (buffer.length < 12) {
        return null;
    }
    const ftypIndex = buffer.indexOf('ftyp', 4, 'ascii');
    if (ftypIndex === -1 || buffer.length < ftypIndex + 8) {
        return null;
    }
    return buffer.subarray(ftypIndex + 4, ftypIndex + 8).toString('ascii');
}
function detectContainer(extension, buffer) {
    const container = CONTAINER_BY_EXTENSION[extension] ?? null;
    if (container === 'mp4' || container === 'quicktime') {
        return { container, detail: detectContainerDetail(buffer) };
    }
    return { container, detail: null };
}
function detectCodec(extension) {
    return CODEC_BY_EXTENSION[extension] ?? null;
}
function detectMime(extension) {
    return MIME_BY_EXTENSION[extension] ?? 'application/octet-stream';
}
async function readScanBuffer(filePath) {
    const handle = await node_fs_1.default.promises.open(filePath, 'r');
    try {
        const stats = await handle.stat();
        const size = Math.min(stats.size, MAX_SCAN_BYTES);
        const buffer = Buffer.alloc(Number(size));
        await handle.read(buffer, 0, buffer.length, 0);
        return buffer;
    }
    finally {
        await handle.close();
    }
}
function hashFile(filePath) {
    const hash = node_crypto_1.default.createHash('sha256');
    const stream = node_fs_1.default.createReadStream(filePath);
    return new Promise((resolve, reject) => {
        stream.on('data', (chunk) => {
            hash.update(chunk);
        });
        stream.on('error', reject);
        stream.on('end', () => {
            resolve(hash.digest('hex'));
        });
    });
}
async function buildMediaEvidence(options) {
    const resolvedPath = options.resolvedPath ?? node_path_1.default.resolve(options.inputPath);
    const stats = await node_fs_1.default.promises.stat(resolvedPath);
    const scanBuffer = await readScanBuffer(resolvedPath);
    const extension = node_path_1.default.extname(resolvedPath).toLowerCase();
    const { container, detail } = detectContainer(extension, scanBuffer);
    const codec = detectCodec(extension);
    const mime = detectMime(extension);
    const sha256 = await hashFile(resolvedPath);
    const bufferText = scanBuffer.toString('latin1').toLowerCase();
    const markers = C2PA_MARKERS.filter((marker) => bufferText.includes(marker));
    const c2paPresent = markers.length > 0;
    const c2paStatus = c2paPresent ? 'unverified' : 'absent';
    const warnings = [];
    if (c2paPresent) {
        warnings.push('C2PA claims detected; verification intentionally constrained to detection-only.');
    }
    else {
        warnings.push('No C2PA claims detected; media authenticity must be established via provenance evidence.');
    }
    const report = {
        schemaVersion: SCHEMA_VERSION,
        input: {
            path: options.inputPath,
            filename: node_path_1.default.basename(options.inputPath),
        },
        media: {
            sha256,
            sizeBytes: stats.size,
            mime,
            extension,
            container,
            containerDetail: detail,
            codec,
        },
        provenance: {
            c2pa: {
                present: c2paPresent,
                status: c2paStatus,
                markers,
            },
        },
        warnings,
    };
    const metrics = {
        schemaVersion: SCHEMA_VERSION,
        counts: {
            files: 1,
            c2paPresent: c2paPresent ? 1 : 0,
            c2paUnverified: c2paPresent ? 1 : 0,
        },
    };
    const stamp = {
        schemaVersion: SCHEMA_VERSION,
        generatedAt: new Date().toISOString(),
        input: {
            path: options.inputPath,
            resolvedPath,
        },
        fileTimestamps: {
            mtimeMs: stats.mtimeMs,
            ctimeMs: stats.ctimeMs,
        },
        tool: {
            name: options.toolName ?? 'summit',
            version: options.toolVersion ?? 'unknown',
        },
    };
    return { report, metrics, stamp };
}
async function writeEvidenceArtifacts(outputDir, evidence) {
    await node_fs_1.default.promises.mkdir(outputDir, { recursive: true });
    const reportPath = node_path_1.default.join(outputDir, 'report.json');
    const metricsPath = node_path_1.default.join(outputDir, 'metrics.json');
    const stampPath = node_path_1.default.join(outputDir, 'stamp.json');
    await node_fs_1.default.promises.writeFile(reportPath, `${JSON.stringify(evidence.report, null, 2)}\n`, 'utf8');
    await node_fs_1.default.promises.writeFile(metricsPath, `${JSON.stringify(evidence.metrics, null, 2)}\n`, 'utf8');
    await node_fs_1.default.promises.writeFile(stampPath, `${JSON.stringify(evidence.stamp, null, 2)}\n`, 'utf8');
}
