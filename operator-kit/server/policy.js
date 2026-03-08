"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.loadPolicy = loadPolicy;
exports.watchPolicy = watchPolicy;
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const crypto_1 = __importDefault(require("crypto"));
const yaml_1 = __importDefault(require("yaml"));
const POLICY_FILE = process.env.POLICY_FILE || path_1.default.resolve('config/router.policy.yml');
let cached = null;
function loadPolicy() {
    if (cached)
        return cached;
    const text = fs_1.default.readFileSync(POLICY_FILE, 'utf8');
    const p = yaml_1.default.parse(text);
    p._loadedAt = Date.now();
    p._hash = crypto_1.default.createHash('sha1').update(text).digest('hex');
    cached = p;
    return p;
}
function watchPolicy(onChange) {
    fs_1.default.watch(POLICY_FILE, { persistent: false }, () => {
        try {
            cached = null;
            const p = loadPolicy();
            onChange(p);
        }
        catch (e) {
            // eslint-disable-next-line no-console
            console.error('policy reload failed', e);
        }
    });
}
