"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.VersionStore = void 0;
const crypto_1 = __importDefault(require("crypto"));
class VersionStore {
    versionsByTemplate = new Map();
    record(template, artifact, createdBy) {
        const checksum = crypto_1.default.createHash('sha256').update(artifact.buffer).digest('hex');
        const version = {
            id: crypto_1.default.randomUUID(),
            templateId: template.id,
            checksum,
            createdAt: new Date(),
            createdBy,
            metadata: { mimeType: artifact.mimeType, format: artifact.format },
        };
        const versions = this.versionsByTemplate.get(template.id) || [];
        versions.push(version);
        this.versionsByTemplate.set(template.id, versions);
        return version;
    }
    history(templateId) {
        return [...(this.versionsByTemplate.get(templateId) || [])].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
    }
}
exports.VersionStore = VersionStore;
