import { mkdirSync } from 'fs';
import { join } from 'path';
import { startMicroVM, createSnapshot, restoreFromSnapshot, stopMicroVM, invokeSandbox as fcInvoke, VmHandle, VmSpec } from './firecracker';

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
  if (inFlight.has(toolClass) || warmPool.has(toolClass)) return;
  inFlight.add(toolClass);
  try {
    mkdirSync(SNAPSHOT_DIR, { recursive: true });
    const baseVm = await startMicroVM(toolClass, spec);
    const snapPath = join(SNAPSHOT_DIR, `${toolClass}.fc`);
    await createSnapshot(baseVm, snapPath);
    await stopMicroVM(baseVm);
    warmPool.set(toolClass, []);
  } finally {
    inFlight.delete(toolClass);
  }
}

export async function checkoutVm(toolClass: string): Promise<VmHandle> {
  const pool = warmPool.get(toolClass) ?? [];
  const handle = pool.pop();
  if (handle) {
    warmPool.set(toolClass, pool);
    recordUsage(toolClass);
    return handle;
  }
  const snapshotPath = join(SNAPSHOT_DIR, `${toolClass}.fc`);
  try {
    const vm = await restoreFromSnapshot(toolClass, snapshotPath);
    recordUsage(toolClass);
    return vm;
  } catch (err) {
    console.warn('snapshot restore failed, starting fresh', err);
    recordUsage(toolClass);
    return startMicroVM(toolClass, spec);
  }
}

export async function releaseVm(vm: VmHandle) {
  const pool = warmPool.get(vm.toolClass) ?? [];
  if (pool.length < Number(process.env.FC_POOL_MAX ?? 8)) {
    pool.push(vm);
    warmPool.set(vm.toolClass, pool);
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
  const pool = warmPool.get(toolClass) ?? [];
  const target = Math.max(DEFAULT_TARGET, Math.ceil(usageEwma.get(toolClass) ?? DEFAULT_TARGET));
  const deficit = target - pool.length;
  if (deficit <= 0) return;
  const snapshotPath = join(SNAPSHOT_DIR, `${toolClass}.fc`);
  for (let i = 0; i < deficit; i += 1) {
    try {
      const vm = await restoreFromSnapshot(toolClass, snapshotPath);
      pool.push(vm);
    } catch (error) {
      console.warn(`restore for prewarm ${toolClass} failed`, error);
      break;
    }
  }
  warmPool.set(toolClass, pool);
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
*** End
