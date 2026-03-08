"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.builtInTools = exports.localGrepTool = exports.dnsLookupTool = exports.httpHeadTool = void 0;
const dns_1 = require("dns");
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const promises_1 = require("timers/promises");
const withTimeout = async (promise, timeoutMs) => {
    return Promise.race([
        promise,
        (0, promises_1.setTimeout)(timeoutMs).then(() => {
            throw new Error(`Timeout after ${timeoutMs}ms`);
        }),
    ]);
};
exports.httpHeadTool = {
    name: 'http_head',
    version: '0.1.0',
    description: 'Performs a HEAD request (or GET fallback) to retrieve metadata only.',
    async execute(inputs, context) {
        const target = String(inputs.url || '');
        if (!target) {
            throw new Error('url is required');
        }
        if (context.dryRun || !context.labMode) {
            return {
                output: { url: target, status: 'dry-run', headers: {}, mock: true },
                notes: 'Dry-run mode; no network call performed.',
            };
        }
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), context.timeoutMs);
        try {
            const res = await withTimeout(fetch(target, { method: 'HEAD', signal: controller.signal }).catch(() => fetch(target, { method: 'GET', signal: controller.signal })), context.timeoutMs);
            const headers = {};
            res.headers.forEach((value, key) => {
                headers[key] = value;
            });
            return {
                output: { url: target, status: res.status, headers },
                stdout: JSON.stringify(headers, null, 2),
            };
        }
        finally {
            clearTimeout(timeout);
        }
    },
};
exports.dnsLookupTool = {
    name: 'dns_lookup',
    version: '0.1.0',
    description: 'Resolves DNS records (A/AAAA/CNAME) for an allowlisted domain.',
    async execute(inputs, context) {
        const domain = String(inputs.domain || '');
        if (!domain) {
            throw new Error('domain is required');
        }
        if (context.dryRun || !context.labMode) {
            return {
                output: { domain, records: [], status: 'dry-run', mock: true },
                notes: 'Dry-run mode; resolver not invoked.',
            };
        }
        const records = await withTimeout(dns_1.promises.lookup(domain, { all: true }), context.timeoutMs);
        return { output: { domain, records } };
    },
};
const localGrepTool = (root) => ({
    name: 'local_grep',
    version: '0.1.0',
    description: 'Searches for a safe string within the local artifacts folder only.',
    async execute(inputs) {
        const needle = String(inputs.pattern || '');
        if (!needle) {
            throw new Error('pattern is required');
        }
        const targetDir = path_1.default.resolve(root);
        if (!targetDir.includes(path_1.default.resolve('artifacts'))) {
            throw new Error('local_grep restricted to artifacts folder');
        }
        if (!fs_1.default.existsSync(targetDir)) {
            return { output: { matches: [], note: 'No artifacts directory present.' } };
        }
        const files = fs_1.default.readdirSync(targetDir);
        const matches = [];
        for (const file of files) {
            const fullPath = path_1.default.join(targetDir, file);
            const stat = fs_1.default.statSync(fullPath);
            if (stat.isDirectory())
                continue;
            const content = fs_1.default.readFileSync(fullPath, 'utf-8');
            const count = content.split(needle).length - 1;
            if (count > 0) {
                matches.push({ file, count });
            }
        }
        return { output: { matches } };
    },
});
exports.localGrepTool = localGrepTool;
const builtInTools = (artifactRoot) => [
    exports.httpHeadTool,
    exports.dnsLookupTool,
    (0, exports.localGrepTool)(path_1.default.join(artifactRoot, 'raw')),
];
exports.builtInTools = builtInTools;
