import { mkdirSync } from 'fs';
import { join } from 'path';
import { startMicroVM, createSnapshot, restoreFromSnapshot, stopMicroVM, invokeSandbox as fcInvoke, VmHandle, VmSpec } from './firecracker';
import { parseToolClass } from './validation';

const spec: VmSpec = {
  kernelPath: process.env.FC_KERNEL_PATH ?? '/opt/intelgraph/fc/vmlinux.bin',
  rootfsPath: process.env.FC_ROOTFS_PATH ?? '/opt/intelgraph/fc/rootfs.ext4',
  memMB: Number(process.env.FC_MEM_MB ?? 512),
  vcpuCount: Number(process.env.FC_VCPU ?? 1)
};

const SNAPSHOT_DIR = process.env.FC_SNAPSHOT_DIR ?? '/var/lib/intelgraph-fc/snapshots';
const warmPool = new Map<string, VmHandle[]>();
const inFlight = new Set<string>();
const usageEwma = new Map<string, number>();
const lastCheckout = new Map<string, number>();
let prewarmTimer: NodeJS.Timeout | null = null;

const DEFAULT_TARGET = Number(process.env.FC_POOL_TARGET ?? 2);
const EWMA_ALPHA = Number(process.env.FC_PREWARM_ALPHA ?? 0.3);
const PREWARM_INTERVAL_MS = Number(process.env.FC_PREWARM_INTERVAL_MS ?? 30_000);

export async function ensurePrewarmedSnapshot(toolClass: string) {
  const safeToolClass = parseToolClass(toolClass);
  if (inFlight.has(safeToolClass) || warmPool.has(safeToolClass)) return;
  inFlight.add(safeToolClass);
  try {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const baseVm = await startMicroVM(safeToolClass, spec);
    const snapPath = join(SNAPSHOT_DIR, `${safeToolClass}.fc`);
    await createSnapshot(baseVm, snapPath);
    await stopMicroVM(baseVm);
    warmPool.set(safeToolClass, []);
  } finally {
    inFlight.delete(safeToolClass);
  }
}

export async function checkoutVm(toolClass: string): Promise<VmHandle> {
  const safeToolClass = parseToolClass(toolClass);
  const pool = warmPool.get(safeToolClass) ?? [];
  const handle = pool.pop();
  if (handle) {
    warmPool.set(safeToolClass, pool);
    recordUsage(safeToolClass);
    return handle;
  }
  const snapshotPath = join(SNAPSHOT_DIR, `${safeToolClass}.fc`);
  try {
    const vm = await restoreFromSnapshot(safeToolClass, snapshotPath);
    recordUsage(safeToolClass);
    return vm;
  } catch (err) {
    console.warn('snapshot restore failed, starting fresh', err);
    recordUsage(safeToolClass);
    return startMicroVM(safeToolClass, spec);
  }
}

export async function releaseVm(vm: VmHandle) {
  const safeToolClass = parseToolClass(vm.toolClass);
  const pool = warmPool.get(safeToolClass) ?? [];
  if (pool.length < Number(process.env.FC_POOL_MAX ?? 8)) {
    pool.push(vm);
    warmPool.set(safeToolClass, pool);
    return;
  }
  await stopMicroVM(vm);
}

export function invokeSandbox(vm: VmHandle, sessionId: string, fn: string, args: unknown) {
  return fcInvoke(vm, sessionId, fn, args);
}

export function startPrewarmManager(toolClasses: string[]) {
  if (prewarmTimer) return;
  prewarmTimer = setInterval(async () => {
    for (const tool of toolClasses) {
      try {
        await ensurePrewarmedSnapshot(tool);
        await ensurePoolCapacity(tool);
      } catch (error) {
        console.warn(`prewarm failed for ${tool}`, error);
      }
    }
  }, PREWARM_INTERVAL_MS);
  prewarmTimer.unref?.();
}

async function ensurePoolCapacity(toolClass: string) {
  const safeToolClass = parseToolClass(toolClass);
  const pool = warmPool.get(safeToolClass) ?? [];
  const target = Math.max(
    DEFAULT_TARGET,
    Math.ceil(usageEwma.get(safeToolClass) ?? DEFAULT_TARGET),
  );
  const deficit = target - pool.length;
  if (deficit <= 0) return;
  const snapshotPath = join(SNAPSHOT_DIR, `${safeToolClass}.fc`);
  for (let i = 0; i < deficit; i += 1) {
    try {
      const vm = await restoreFromSnapshot(safeToolClass, snapshotPath);
      pool.push(vm);
    } catch (error) {
      console.warn(`restore for prewarm ${safeToolClass} failed`, error);
      break;
    }
  }
  warmPool.set(safeToolClass, pool);
}

function recordUsage(toolClass: string) {
  const now = Date.now();
  const last = lastCheckout.get(toolClass) ?? now;
  lastCheckout.set(toolClass, now);
  const deltaMs = Math.max(now - last, 1);
  const perMinute = 60_000 / deltaMs;
  const previous = usageEwma.get(toolClass) ?? DEFAULT_TARGET;
  const updated = EWMA_ALPHA * perMinute + (1 - EWMA_ALPHA) * previous;
  usageEwma.set(toolClass, Math.max(updated, DEFAULT_TARGET));
}

export type { VmHandle } from './firecracker';
