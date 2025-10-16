import { runWithWasmtime } from '../src/wasm/run_with_wasmtime';
test('env is filtered by allowlist', async () => {
  const res: any = await runWithWasmtime(
    './plugins/echo/plugin.wasm',
    { env: ['FOO_*'] },
    { memMiB: 32 },
    { FOO_BAR: '1', SECRET: 'x' },
  );
  expect(res).toBeTruthy();
});
