import { loadConfig } from './config';
import { buildApp } from './app';

export async function main() {
  try {
    const config = loadConfig();
    const app = await buildApp(config);
    await app.listen({ port: config.port, host: config.host });
    app.log.info(`Provenance ledger listening on ${config.host}:${config.port}`);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('Failed to start prov-ledger service', error);
    process.exit(1);
  }
}

export function runIfMain(
  entryModule: NodeModule | undefined,
  currentModule: NodeModule,
  runner: () => Promise<void> | void
) {
  if (entryModule === currentModule) {
    void runner();
  }
}

runIfMain(require.main, module, main);

export default main;
