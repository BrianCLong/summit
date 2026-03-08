"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.persistentUsageRepository = exports.meterStore = exports.FileTenantUsageRepository = exports.FileMeterStore = void 0;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const fast_json_stable_stringify_1 = __importDefault(require("fast-json-stable-stringify"));
const repository_js_1 = require("./repository.js");
// We will implement a file-based store
const DATA_DIR = path_1.default.join(process.cwd(), 'data', 'metering');
if (!fs_1.default.existsSync(DATA_DIR)) {
    fs_1.default.mkdirSync(DATA_DIR, { recursive: true });
}
class FileMeterStore {
    logPath = path_1.default.join(DATA_DIR, 'events.jsonl');
    lastHash = '';
    constructor() {
        // Initialize hash from last line if exists
        if (fs_1.default.existsSync(this.logPath)) {
            // Read last line to get its hash
            // For now, we assume empty.
        }
    }
    async append(event) {
        const lineContent = (0, fast_json_stable_stringify_1.default)(event);
        // Hash chain: SHA256(prevHash + lineContent)
        const newHash = crypto_1.default.createHash('sha256')
            .update(this.lastHash + lineContent)
            .digest('hex');
        const line = (0, fast_json_stable_stringify_1.default)({
            data: event,
            hash: newHash,
            prevHash: this.lastHash
        }) + '\n';
        await fs_1.default.promises.appendFile(this.logPath, line, 'utf8');
        this.lastHash = newHash;
    }
    async verifyLogIntegrity() {
        if (!fs_1.default.existsSync(this.logPath)) {
            return { valid: true };
        }
        const content = await fs_1.default.promises.readFile(this.logPath, 'utf8');
        const lines = content.trim().split('\n');
        let calculatedLastHash = '';
        for (let i = 0; i < lines.length; i++) {
            try {
                if (!lines[i].trim())
                    continue;
                const record = JSON.parse(lines[i]);
                // Use stable stringify for verification too
                const eventStr = (0, fast_json_stable_stringify_1.default)(record.data);
                if (record.prevHash !== calculatedLastHash) {
                    return { valid: false, brokenAtLine: i + 1 };
                }
                const expectedHash = crypto_1.default.createHash('sha256')
                    .update(calculatedLastHash + eventStr)
                    .digest('hex');
                if (record.hash !== expectedHash) {
                    return { valid: false, brokenAtLine: i + 1 };
                }
                calculatedLastHash = expectedHash;
            }
            catch (e) {
                return { valid: false, brokenAtLine: i + 1 };
            }
        }
        return { valid: true };
    }
}
exports.FileMeterStore = FileMeterStore;
class FileTenantUsageRepository extends repository_js_1.TenantUsageDailyRepository {
    filePath = path_1.default.join(DATA_DIR, 'rollups.json');
    constructor() {
        super();
        this.load();
    }
    load() {
        try {
            if (fs_1.default.existsSync(this.filePath)) {
                const data = fs_1.default.readFileSync(this.filePath, 'utf8');
                const rows = JSON.parse(data);
                super.saveAll(rows);
            }
        }
        catch (err) {
            console.error('Failed to load metering rollups', err);
        }
    }
    async saveAll(rows) {
        await super.saveAll(rows);
        const all = await this.list();
        await fs_1.default.promises.writeFile(this.filePath, JSON.stringify(all, null, 2), 'utf8');
    }
}
exports.FileTenantUsageRepository = FileTenantUsageRepository;
exports.meterStore = new FileMeterStore();
exports.persistentUsageRepository = new FileTenantUsageRepository();
