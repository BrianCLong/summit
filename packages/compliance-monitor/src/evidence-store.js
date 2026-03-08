"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.EvidenceStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
const promises_1 = __importDefault(require("fs/promises"));
const path_1 = __importDefault(require("path"));
class EvidenceStore {
    basePath;
    constructor(basePath) {
        this.basePath = basePath;
    }
    async storeEvidence(controlId, content, options) {
        const controlDir = path_1.default.join(this.basePath, controlId);
        await promises_1.default.mkdir(controlDir, { recursive: true });
        const createdAt = new Date();
        const buffer = typeof content === 'string' ? Buffer.from(content) : content;
        const hash = crypto_1.default.createHash('sha256').update(buffer).digest('hex');
        const id = `${createdAt.getTime()}-${hash.slice(0, 8)}`;
        const artifactPath = path_1.default.join(controlDir, `${id}.evidence`);
        try {
            await promises_1.default.writeFile(artifactPath, buffer, { flag: 'wx' });
        }
        catch (error) {
            if (error.code === 'EEXIST') {
                throw new Error(`Evidence collision detected for control ${controlId}`);
            }
            throw error;
        }
        const record = {
            id,
            controlId,
            createdAt,
            hash,
            signer: options.signer,
            artifactPath,
            ttlDays: options.ttlDays,
            retentionDays: options.retentionDays,
            metadata: options.metadata,
        };
        await this.appendIndex(controlDir, record);
        return record;
    }
    async listEvidence(controlId) {
        const controlDir = path_1.default.join(this.basePath, controlId);
        try {
            const indexPath = path_1.default.join(controlDir, 'index.json');
            const raw = await promises_1.default.readFile(indexPath, 'utf-8');
            const parsed = JSON.parse(raw);
            return parsed.map(entry => ({ ...entry, createdAt: new Date(entry.createdAt) }));
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
    async latest(controlId) {
        const records = await this.listEvidence(controlId);
        return records.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
    }
    async purgeExpired(now = new Date()) {
        const removed = [];
        const controlIds = await this.listControlIds();
        for (const controlId of controlIds) {
            const records = await this.listEvidence(controlId);
            const keep = [];
            for (const record of records) {
                const expiry = new Date(record.createdAt);
                expiry.setDate(expiry.getDate() + record.retentionDays);
                if (expiry <= now) {
                    await promises_1.default.rm(record.artifactPath, { force: true });
                    removed.push(record);
                }
                else {
                    keep.push(record);
                }
            }
            await this.writeIndex(path_1.default.join(this.basePath, controlId), keep);
        }
        return removed;
    }
    async appendIndex(controlDir, record) {
        const index = await this.listEvidence(path_1.default.basename(controlDir));
        index.push(record);
        await this.writeIndex(controlDir, index);
    }
    async writeIndex(controlDir, records) {
        await promises_1.default.mkdir(controlDir, { recursive: true });
        const serialized = JSON.stringify(records, null, 2);
        await promises_1.default.writeFile(path_1.default.join(controlDir, 'index.json'), serialized);
    }
    async listControlIds() {
        try {
            const entries = await promises_1.default.readdir(this.basePath, { withFileTypes: true });
            return entries.filter(entry => entry.isDirectory()).map(entry => entry.name);
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return [];
            }
            throw error;
        }
    }
}
exports.EvidenceStore = EvidenceStore;
