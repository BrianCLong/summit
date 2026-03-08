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
const cas_key_1 = require("../ci/cas_key");
const push_1 = require("../oci/push");
const child = __importStar(require("child_process"));
const files = (process.env.SHARD_FILES || '').split(',').filter(Boolean);
const key = (0, cas_key_1.casKey)({
    files,
    node: '18',
    pnpm: '9',
    jest: '29',
    env: {},
}).replace('ci:', '');
const ref = { repo: `ghcr.io/${process.env.GITHUB_REPOSITORY}/ci`, tag: key };
try {
    const out = child.execSync(`node tools/ci/run_cached.ts`, { stdio: 'pipe' });
    await (0, push_1.push)(ref, 'application/vnd.intelgraph.ci.log', Buffer.from(out, 'utf8'), { kind: process.env.SHARD_KIND || '' });
    process.stdout.write(out);
}
catch (e) {
    await (0, push_1.push)(ref, 'application/vnd.intelgraph.ci.log', Buffer.from(e.stdout || e.message || '', 'utf8'), { kind: 'error' });
    process.exit(1);
}
