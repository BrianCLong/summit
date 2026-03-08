"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileRevocationRegistry = exports.InMemoryRevocationRegistry = void 0;
const node_fs_1 = require("node:fs");
const node_path_1 = require("node:path");
const promises_1 = require("node:fs/promises");
class InMemoryRevocationRegistry {
    revoked = new Set();
    constructor(initial = []) {
        for (const id of initial) {
            this.revoked.add(id);
        }
    }
    async isRevoked(credentialId) {
        return this.revoked.has(credentialId);
    }
    async revoke(credentialId) {
        this.revoked.add(credentialId);
    }
    async list() {
        return Array.from(this.revoked);
    }
}
exports.InMemoryRevocationRegistry = InMemoryRevocationRegistry;
class FileRevocationRegistry extends InMemoryRevocationRegistry {
    filePath;
    constructor(filePath) {
        super();
        this.filePath = filePath;
    }
    async isRevoked(credentialId) {
        await this.load();
        return super.isRevoked(credentialId);
    }
    async revoke(credentialId) {
        await this.load();
        await super.revoke(credentialId);
        await this.persist();
    }
    async list() {
        await this.load();
        return super.list();
    }
    async load() {
        try {
            const contents = await node_fs_1.promises.readFile(this.filePath, 'utf8');
            const parsed = JSON.parse(contents);
            if (Array.isArray(parsed.revoked)) {
                this.revoked = new Set(parsed.revoked);
            }
        }
        catch (error) {
            if (error.code === 'ENOENT') {
                return;
            }
            throw error;
        }
    }
    async persist() {
        await (0, promises_1.mkdir)((0, node_path_1.dirname)(this.filePath), { recursive: true });
        const data = JSON.stringify({ revoked: await super.list() }, null, 2);
        await node_fs_1.promises.writeFile(this.filePath, data, 'utf8');
    }
}
exports.FileRevocationRegistry = FileRevocationRegistry;
