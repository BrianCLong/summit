"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.startMicroVM = startMicroVM;
exports.createSnapshot = createSnapshot;
exports.restoreFromSnapshot = restoreFromSnapshot;
exports.stopMicroVM = stopMicroVM;
exports.invokeSandbox = invokeSandbox;
const path_1 = require("path");
const crypto_1 = require("crypto");
const execa_1 = require("execa");
const RUNTIME_DIR = process.env.FIRECRACKER_RUNTIME_DIR ?? '/var/run/intelgraph-fc';
const MOCK = process.env.FC_MOCK === '1' || !process.env.FC_KERNEL_PATH;
async function startMicroVM(toolClass, spec) {
    const id = `fc_${toolClass}_${(0, crypto_1.randomUUID)().slice(0, 8)}`;
    const apiSocket = (0, path_1.join)(RUNTIME_DIR, `${id}.sock`);
    if (MOCK) {
        return { id, apiSocket, toolClass };
    }
    await (0, execa_1.execa)('bash', ['-lc', `mkdir -p ${RUNTIME_DIR}`]);
    await (0, execa_1.execa)('bash', [
        '-lc',
        `nohup firecracker --api-sock ${apiSocket} >/tmp/${id}.log 2>&1 &`,
    ]);
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
    return { id, apiSocket, toolClass };
}
async function createSnapshot(handle, snapshotPath) {
    await fcPut(handle.apiSocket, '/snapshot/create', {
        snapshot_type: 'Full',
        snapshot_path: snapshotPath,
        mem_file_path: `${snapshotPath}.mem`,
    });
    handle.snapshotPath = snapshotPath;
}
async function restoreFromSnapshot(toolClass, snapshotPath) {
    const id = `fc_${toolClass}_${(0, crypto_1.randomUUID)().slice(0, 8)}`;
    const apiSocket = (0, path_1.join)(RUNTIME_DIR, `${id}.sock`);
    if (MOCK) {
        return { id, apiSocket, toolClass, snapshotPath };
    }
    await (0, execa_1.execa)('bash', [
        '-lc',
        `nohup firecracker --api-sock ${apiSocket} >/tmp/${id}.log 2>&1 &`,
    ]);
    await fcPut(apiSocket, '/snapshot/load', {
        snapshot_path: snapshotPath,
        mem_file_path: `${snapshotPath}.mem`,
        enable_diff_snapshots: false,
    });
    return { id, apiSocket, toolClass, snapshotPath };
}
async function stopMicroVM(handle) {
    if (MOCK)
        return;
    try {
        await fcPut(handle.apiSocket, '/actions', {
            action_type: 'SendCtrlAltDel',
        });
    }
    catch (err) {
        console.warn('failed to stop microVM gracefully', err);
    }
}
async function invokeSandbox(handle, sessionId, fn, args) {
    // TODO: tie into deterministic sandbox runner communicating with VM guest agent.
    return {
        sessionId,
        vmId: handle.id,
        fn,
        ok: true,
        result: { echo: args },
    };
}
async function fcPut(apiSocket, path, payload) {
    if (MOCK)
        return;
    const body = JSON.stringify(payload);
    await (0, execa_1.execa)('bash', [
        '-lc',
        `curl --unix-socket ${apiSocket} -s -X PUT http://localhost${path} -H 'Accept: application/json' -H 'Content-Type: application/json' -d '${body.replace(/'/g, "'\\''")}'`,
    ]);
}
