"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ensurePrewarmedSnapshot = ensurePrewarmedSnapshot;
exports.checkoutVm = checkoutVm;
exports.releaseVm = releaseVm;
exports.invokeSandbox = invokeSandbox;
exports.startPrewarmManager = startPrewarmManager;
const fs_1 = require("fs");
const path_1 = require("path");
const firecracker_1 = require("./firecracker");
const spec = {
    kernelPath: process.env.FC_KERNEL_PATH ?? '/opt/intelgraph/fc/vmlinux.bin',
    rootfsPath: process.env.FC_ROOTFS_PATH ?? '/opt/intelgraph/fc/rootfs.ext4',
    memMB: Number(process.env.FC_MEM_MB ?? 512),
    vcpuCount: Number(process.env.FC_VCPU ?? 1)
};
const SNAPSHOT_DIR = process.env.FC_SNAPSHOT_DIR ?? '/var/lib/intelgraph-fc/snapshots';
const warmPool = new Map();
const inFlight = new Set();
const usageEwma = new Map();
const lastCheckout = new Map();
let prewarmTimer = null;
const DEFAULT_TARGET = Number(process.env.FC_POOL_TARGET ?? 2);
const EWMA_ALPHA = Number(process.env.FC_PREWARM_ALPHA ?? 0.3);
const PREWARM_INTERVAL_MS = Number(process.env.FC_PREWARM_INTERVAL_MS ?? 30_000);
async function ensurePrewarmedSnapshot(toolClass) {
    if (inFlight.has(toolClass) || warmPool.has(toolClass))
        return;
    inFlight.add(toolClass);
    try {
        (0, fs_1.mkdirSync)(SNAPSHOT_DIR, { recursive: true });
        const baseVm = await (0, firecracker_1.startMicroVM)(toolClass, spec);
        const snapPath = (0, path_1.join)(SNAPSHOT_DIR, `${toolClass}.fc`);
        await (0, firecracker_1.createSnapshot)(baseVm, snapPath);
        await (0, firecracker_1.stopMicroVM)(baseVm);
        warmPool.set(toolClass, []);
    }
    finally {
        inFlight.delete(toolClass);
    }
}
async function checkoutVm(toolClass) {
    const pool = warmPool.get(toolClass) ?? [];
    const handle = pool.pop();
    if (handle) {
        warmPool.set(toolClass, pool);
        recordUsage(toolClass);
        return handle;
    }
    const snapshotPath = (0, path_1.join)(SNAPSHOT_DIR, `${toolClass}.fc`);
    try {
        const vm = await (0, firecracker_1.restoreFromSnapshot)(toolClass, snapshotPath);
        recordUsage(toolClass);
        return vm;
    }
    catch (err) {
        console.warn('snapshot restore failed, starting fresh', err);
        recordUsage(toolClass);
        return (0, firecracker_1.startMicroVM)(toolClass, spec);
    }
}
async function releaseVm(vm) {
    const pool = warmPool.get(vm.toolClass) ?? [];
    if (pool.length < Number(process.env.FC_POOL_MAX ?? 8)) {
        pool.push(vm);
        warmPool.set(vm.toolClass, pool);
        return;
    }
    await (0, firecracker_1.stopMicroVM)(vm);
}
function invokeSandbox(vm, sessionId, fn, args) {
    return (0, firecracker_1.invokeSandbox)(vm, sessionId, fn, args);
}
function startPrewarmManager(toolClasses) {
    if (prewarmTimer)
        return;
    prewarmTimer = setInterval(async () => {
        for (const tool of toolClasses) {
            try {
                await ensurePrewarmedSnapshot(tool);
                await ensurePoolCapacity(tool);
            }
            catch (error) {
                console.warn(`prewarm failed for ${tool}`, error);
            }
        }
    }, PREWARM_INTERVAL_MS);
    prewarmTimer.unref?.();
}
async function ensurePoolCapacity(toolClass) {
    const pool = warmPool.get(toolClass) ?? [];
    const target = Math.max(DEFAULT_TARGET, Math.ceil(usageEwma.get(toolClass) ?? DEFAULT_TARGET));
    const deficit = target - pool.length;
    if (deficit <= 0)
        return;
    const snapshotPath = (0, path_1.join)(SNAPSHOT_DIR, `${toolClass}.fc`);
    for (let i = 0; i < deficit; i += 1) {
        try {
            const vm = await (0, firecracker_1.restoreFromSnapshot)(toolClass, snapshotPath);
            pool.push(vm);
        }
        catch (error) {
            console.warn(`restore for prewarm ${toolClass} failed`, error);
            break;
        }
    }
    warmPool.set(toolClass, pool);
}
function recordUsage(toolClass) {
    const now = Date.now();
    const last = lastCheckout.get(toolClass) ?? now;
    lastCheckout.set(toolClass, now);
    const deltaMs = Math.max(now - last, 1);
    const perMinute = 60_000 / deltaMs;
    const previous = usageEwma.get(toolClass) ?? DEFAULT_TARGET;
    const updated = EWMA_ALPHA * perMinute + (1 - EWMA_ALPHA) * previous;
    usageEwma.set(toolClass, Math.max(updated, DEFAULT_TARGET));
}
    **  * End;
