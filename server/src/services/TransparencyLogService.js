"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TransparencyLogService = void 0;
const node_crypto_1 = __importDefault(require("node:crypto"));
class TransparencyLogService {
    static instance;
    currentRoot = '';
    leaves = [];
    constructor() { }
    static getInstance() {
        if (!TransparencyLogService.instance) {
            TransparencyLogService.instance = new TransparencyLogService();
        }
        return TransparencyLogService.instance;
    }
    addEntry(data) {
        const leaf = node_crypto_1.default.createHash('sha256').update(data).digest('hex');
        this.leaves.push(leaf);
        this.recalculateRoot();
        return leaf;
    }
    getRoot() {
        return this.currentRoot;
    }
    recalculateRoot() {
        if (this.leaves.length === 0) {
            this.currentRoot = '';
            return;
        }
        let level = [...this.leaves];
        while (level.length > 1) {
            const nextLevel = [];
            for (let i = 0; i < level.length; i += 2) {
                const left = level[i];
                const right = (i + 1 < level.length) ? level[i + 1] : left;
                const hash = node_crypto_1.default.createHash('sha256').update(left + right).digest('hex');
                nextLevel.push(hash);
            }
            level = nextLevel;
        }
        this.currentRoot = level[0];
    }
}
exports.TransparencyLogService = TransparencyLogService;
