"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
const cas_key_1 = require("./cas_key");
const child = __importStar(require("child_process"));
const cas = __importStar(require("./cas"));
const kind = process.env.SHARD_KIND;
const files = (process.env.SHARD_FILES || '').split(',').filter(Boolean);
const key = (0, cas_key_1.casKey)({
    files,
    node: process.env.NODE_VERSION || '18',
    pnpm: process.env.PNPM_VERSION || '9',
    jest: '29',
    env: {},
});
(async () => {
    if (await cas.has(key)) {
        const out = await cas.get(key);
        process.stdout.write(out.toString());
        console.log(`::notice ::CAS hit ${key}`);
        process.exit(0);
    }
    const cmd = kind === 'build'
        ? 'pnpm turbo run build --filter=...[HEAD^]'
        : kind === 'lint'
            ? 'pnpm turbo run lint --filter=...[HEAD^]'
            : kind === 'policy'
                ? 'conftest test policy.json -p tools/policy'
                : `npx jest --ci --runTestsByPath ${files.join(' ')}`;
    const out = child.execSync(cmd, { stdio: 'pipe', encoding: 'utf8' });
    await cas.put(key, Buffer.from(out, 'utf8'));
    process.stdout.write(out);
})();
