import { join } from 'path';
import { randomUUID } from 'crypto';
import { spawn } from 'child_process';
import { mkdir } from 'fs/promises';
import { execa } from 'execa';
import { parseToolClass } from './validation';

export type VmSpec = {
  kernelPath: string;
  rootfsPath: string;
  memMB: number;
  vcpuCount: number;
};

export type VmHandle = {
  id: string;
  apiSocket: string;
  toolClass: string;
  snapshotPath?: string;
};

const RUNTIME_DIR =
  process.env.FIRECRACKER_RUNTIME_DIR ?? '/var/run/intelgraph-fc';
const MOCK = process.env.FC_MOCK === '1' || !process.env.FC_KERNEL_PATH;

export async function startMicroVM(
  toolClass: string,
  spec: VmSpec,
): Promise<VmHandle> {
  const safeToolClass = parseToolClass(toolClass);
  const id = `fc_${safeToolClass}_${randomUUID().slice(0, 8)}`;
  const apiSocket = join(RUNTIME_DIR, `${id}.sock`);

  if (MOCK) {
    return { id, apiSocket, toolClass: safeToolClass };
  }

  await mkdir(RUNTIME_DIR, { recursive: true });
  launchFirecracker(apiSocket);

  await fcPut(apiSocket, '/machine-config', {
    vcpu_count: spec.vcpuCount,
    mem_size_mib: spec.memMB,
    ht_enabled: true,
  });

  await fcPut(apiSocket, '/drives/rootfs', {
    drive_id: 'rootfs',
    path_on_host: spec.rootfsPath,
    is_read_only: false,
    is_root_device: true,
  });

  await fcPut(apiSocket, '/boot-source', {
    kernel_image_path: spec.kernelPath,
    boot_args: 'console=ttyS0 reboot=k panic=1 pci=off',
  });

  await fcPut(apiSocket, '/actions', { action_type: 'InstanceStart' });

  return { id, apiSocket, toolClass: safeToolClass };
}

export async function createSnapshot(handle: VmHandle, snapshotPath: string) {
  await fcPut(handle.apiSocket, '/snapshot/create', {
    snapshot_type: 'Full',
    snapshot_path: snapshotPath,
    mem_file_path: `${snapshotPath}.mem`,
  });
  handle.snapshotPath = snapshotPath;
}

export async function restoreFromSnapshot(
  toolClass: string,
  snapshotPath: string,
): Promise<VmHandle> {
  const safeToolClass = parseToolClass(toolClass);
  const id = `fc_${safeToolClass}_${randomUUID().slice(0, 8)}`;
  const apiSocket = join(RUNTIME_DIR, `${id}.sock`);

  if (MOCK) {
    return { id, apiSocket, toolClass: safeToolClass, snapshotPath };
  }

  await mkdir(RUNTIME_DIR, { recursive: true });
  launchFirecracker(apiSocket);

  await fcPut(apiSocket, '/snapshot/load', {
    snapshot_path: snapshotPath,
    mem_file_path: `${snapshotPath}.mem`,
    enable_diff_snapshots: false,
  });

  return { id, apiSocket, toolClass: safeToolClass, snapshotPath };
}

export async function stopMicroVM(handle: VmHandle) {
  if (MOCK) return;
  try {
    await fcPut(handle.apiSocket, '/actions', {
      action_type: 'SendCtrlAltDel',
    });
  } catch (err) {
    console.warn('failed to stop microVM gracefully', err);
  }
}

export async function invokeSandbox(
  handle: VmHandle,
  sessionId: string,
  fn: string,
  args: unknown,
) {
  // TODO: tie into deterministic sandbox runner communicating with VM guest agent.
  return {
    sessionId,
    vmId: handle.id,
    fn,
    ok: true,
    result: { echo: args },
  };
}

async function fcPut(apiSocket: string, path: string, payload: unknown) {
  if (MOCK) return;
  if (!path.startsWith('/')) {
    throw new Error(`invalid firecracker path: ${path}`);
  }
  const body = JSON.stringify(payload);
  await execa('curl', [
    '--unix-socket',
    apiSocket,
    '-s',
    '-f',
    '-X',
    'PUT',
    `http://localhost${path}`,
    '-H',
    'Accept: application/json',
    '-H',
    'Content-Type: application/json',
    '--data-binary',
    body,
  ]);
}

function launchFirecracker(apiSocket: string) {
  const child = spawn('firecracker', ['--api-sock', apiSocket], {
    detached: true,
    stdio: 'ignore',
  });
  child.unref();
}
