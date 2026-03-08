import { Command } from 'commander';
import { resolveSeraProxyConfig } from '../sera-proxy/config.js';
import { startSeraProxy } from '../sera-proxy/proxy.js';

const SERA_MODEL_WARNING =
  'Non-SERA models are untested; use with caution and validate outputs.';

export function registerSeraProxyCommands(program: Command): void {
  const sera = program
    .command('sera-proxy')
    .description('SERA CLI-style proxy for OpenAI-compatible endpoints');

  sera
    .command('start')
    .description('Start a local SERA proxy with evidence logging')
    .option('--endpoint <url>', 'Upstream endpoint URL (OpenAI-compatible)')
    .option('--api-key <key>', 'API key for upstream endpoint')
    .option('--model <model>', 'Override model in upstream requests')
    .option('--port <port>', 'Port to listen on', (value) => parseInt(value, 10))
    .option(
      '--allow-host <host>',
      'Allowlist host (repeatable, default: localhost, 127.0.0.1)',
      (value, previous: string[]) => [...previous, value],
      []
    )
    .option('--artifact-dir <path>', 'Directory for deterministic evidence artifacts')
    .option('--max-body-bytes <bytes>', 'Max request size in bytes', (value) => parseInt(value, 10))
    .action(async (options) => {
      const config = resolveSeraProxyConfig({
        endpoint: options.endpoint,
        apiKey: options.apiKey,
        model: options.model,
        port: options.port,
        allowHosts: options.allowHost,
        artifactDir: options.artifactDir,
        maxBodyBytes: options.maxBodyBytes,
      });

      if (config.model && !config.model.startsWith('allenai/SERA')) {
        console.warn(SERA_MODEL_WARNING);
      }

      const server = await startSeraProxy(config);
      const address = server.address();
      const port = typeof address === 'object' && address ? address.port : config.port;

      console.log(`SERA proxy listening on http://localhost:${port}`);
      console.log(`Evidence artifacts: ${config.artifactDir}`);
    });
}
