"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.manifestSchema = exports.AdapterLifecycle = void 0;
// @ts-nocheck
const zod_1 = require("zod");
exports.AdapterLifecycle = {
    Install: 'install',
    Enable: 'enable',
    Configure: 'configure',
    Run: 'run',
    Disable: 'disable',
    Uninstall: 'uninstall',
};
exports.manifestSchema = zod_1.z.object({
    name: zod_1.z.string().min(1),
    version: zod_1.z.string().min(1),
    description: zod_1.z.string().min(1),
    entrypoint: zod_1.z.string().min(1),
    capabilities: zod_1.z.array(zod_1.z.string()).min(1),
    requiredPermissions: zod_1.z.array(zod_1.z.string()).min(1),
    claims: zod_1.z.array(zod_1.z.string()).optional(),
    compatibility: zod_1.z.object({
        companyOs: zod_1.z.string().min(1),
    }),
    configSchema: zod_1.z.record(zod_1.z.unknown()).optional(),
    signature: zod_1.z.string().optional(),
});
