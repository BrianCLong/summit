"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.FilePersistenceAdapter = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
class FilePersistenceAdapter {
    baseDir;
    constructor(collectionName) {
        this.baseDir = path_1.default.join(process.cwd(), 'server', 'data', 'governance', collectionName);
        if (!fs_1.default.existsSync(this.baseDir)) {
            fs_1.default.mkdirSync(this.baseDir, { recursive: true });
        }
    }
    async save(key, data) {
        const filePath = path_1.default.join(this.baseDir, `${key}.json`);
        await fs_1.default.promises.writeFile(filePath, JSON.stringify(data, null, 2));
    }
    async load(key) {
        const filePath = path_1.default.join(this.baseDir, `${key}.json`);
        try {
            const content = await fs_1.default.promises.readFile(filePath, 'utf-8');
            return JSON.parse(content);
        }
        catch (e) {
            return null;
        }
    }
    async list() {
        const files = await fs_1.default.promises.readdir(this.baseDir);
        const results = [];
        for (const file of files) {
            if (file.endsWith('.json')) {
                const content = await fs_1.default.promises.readFile(path_1.default.join(this.baseDir, file), 'utf-8');
                results.push(JSON.parse(content));
            }
        }
        return results;
    }
    async delete(key) {
        const filePath = path_1.default.join(this.baseDir, `${key}.json`);
        if (fs_1.default.existsSync(filePath)) {
            await fs_1.default.promises.unlink(filePath);
        }
    }
}
exports.FilePersistenceAdapter = FilePersistenceAdapter;
