let invoke;
try {
  // only available under Tauri
  // eslint-disable-next-line import/no-extraneous-dependencies
  ({ invoke } = await import(' @tauri-apps/api/tauri'));
} catch {
  invoke = async () => { throw new Error('native IPC unavailable'); };
}

export const Native = {
  async version() {
    try { return await invoke('native_version'); }
    catch { return 'web-only'; }
  },
  async policyCheck(input) {
    try { return await invoke('native_policy_check', { input }); }
    catch { return { allow: false, reason: 'native unavailable' }; }
  },
};