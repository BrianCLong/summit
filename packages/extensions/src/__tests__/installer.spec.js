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
const fs = __importStar(require("fs/promises"));
const os = __importStar(require("os"));
const path = __importStar(require("path"));
const vitest_1 = require("vitest");
const installer_js_1 = require("../installer.js");
async function createExtension(version) {
    const dir = await fs.mkdtemp(path.join(os.tmpdir(), `ext-${version}-`));
    await fs.writeFile(path.join(dir, 'extension.json'), JSON.stringify({
        name: 'sample-extension',
        displayName: 'Sample Extension',
        version,
        description: 'Test extension',
        type: 'tool',
        capabilities: ['analytics'],
        permissions: [],
        entrypoints: { main: { type: 'function', path: 'index.mjs', export: 'default' } },
    }, null, 2));
    await fs.writeFile(path.join(dir, 'index.mjs'), "export default async () => ({ exports: {} })");
    await fs.writeFile(path.join(dir, 'pnpm-lock.yaml'), 'lockfileVersion: 9');
    return dir;
}
(0, vitest_1.describe)('ExtensionInstaller', () => {
    (0, vitest_1.it)('installs, updates, rolls back, and audits operations', async () => {
        const installDir = await fs.mkdtemp(path.join(os.tmpdir(), 'install-target-'));
        const auditFile = path.join(installDir, 'audit.log');
        const installer = new installer_js_1.ExtensionInstaller({ installDir, auditFile });
        const v1 = await createExtension('1.0.0');
        await installer.install(v1);
        (0, vitest_1.expect)(await fs.readdir(installDir)).toContain('sample-extension');
        const v2 = await createExtension('1.1.0');
        await installer.update(v2);
        const backups = await fs.readdir(installDir);
        (0, vitest_1.expect)(backups.some((f) => f.includes('.bak'))).toBe(true);
        await installer.rollback('sample-extension', '1.1.0');
        const audit = await installer.getAuditLog();
        (0, vitest_1.expect)(audit).toHaveLength(3);
        (0, vitest_1.expect)(audit.map((e) => e.action)).toEqual(['install', 'update', 'rollback']);
        await installer.uninstall('sample-extension');
        const remaining = await fs.readdir(installDir);
        (0, vitest_1.expect)(remaining.every((f) => !f.startsWith('sample-extension'))).toBe(true);
    });
});
