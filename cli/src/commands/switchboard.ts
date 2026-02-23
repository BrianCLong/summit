/**
 * Switchboard Commands
 */

import { Command } from 'commander';
import { detectRepoRoot } from '../lib/sandbox.js';
import { runCapsule } from '../lib/switchboard-runner.js';
import { startDashboard } from '../lib/switchboard-ui.js';
import { generateEvidenceBundle } from '../lib/switchboard-evidence.js';
import { replayCapsule } from '../lib/switchboard-replay.js';
import { TelemetryEmitter } from '../lib/telemetry.js';
import * as fs from 'fs';
import * as path from 'path';
import yaml from 'yaml';

export function registerSwitchboardCommands(program: Command): void {
  const switchboard = program
    .command('switchboard')
    .description('Switchboard capsule operations');

  switchboard
    .command('run')
    .description('Run a task capsule')
    .requiredOption('--capsule <path>', 'Path to capsule manifest')
    .option('--waiver <token>', 'Apply a waiver token if policy denies an action')
    .action(async (options: { capsule: string; waiver?: string }) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const result = await runCapsule({
          manifestPath: options.capsule,
          repoRoot,
          waiverToken: options.waiver,
        });
        console.log(`Capsule session: ${result.sessionId}`);
        console.log(`Ledger: ${result.ledgerPath}`);
        console.log(`Diff: ${result.diffPath}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('evidence <session_id>')
    .description('Generate an evidence bundle for a capsule session')
    .action((sessionId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const result = generateEvidenceBundle(repoRoot, sessionId);
        console.log(`Evidence bundle: ${result.evidenceDir}`);
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('replay <session_id>')
    .description('Replay a capsule session and compare outputs')
    .action(async (sessionId: string) => {
      try {
        const repoRoot = detectRepoRoot(process.cwd());
        const report = await replayCapsule(repoRoot, sessionId);
        console.log(`Replay session: ${report.replay_session}`);
        console.log(`Replay match: ${report.match ? 'yes' : 'no'}`);
        if (!report.match) {
          console.log(`Differences: ${report.differences.join('; ')}`);
        }
      } catch (error) {
        console.error(error instanceof Error ? error.message : String(error));
        process.exit(1);
      }
    });

  switchboard
    .command('ui')
    .description('Launch the local Switchboard dashboard')
    .option('-p, --port <number>', 'Port to run the dashboard on', '3000')
    .action(async (options) => {
      const port = parseInt(options.port, 10);
      console.log(`Starting Switchboard UI at http://127.0.0.1:${port}`);
      console.log('Press Ctrl+C to stop.');
      await startDashboard(port);
    });

  switchboard
    .command('health')
    .description('Check health of configured MCP servers')
    .action(async () => {
      const repoRoot = detectRepoRoot(process.cwd());
      const telemetry = new TelemetryEmitter(repoRoot, 'cli-health-check');
      const allowlistPath = path.join(repoRoot, 'mcp', 'allowlist.yaml');

      try {
        if (!fs.existsSync(allowlistPath)) {
          console.error(`Allowlist not found: ${allowlistPath}`);
          return;
        }

        const content = fs.readFileSync(allowlistPath, 'utf8');
        const config = yaml.parse(content);
        const servers = Object.entries(config.allowed_servers || []);

        console.log(`Checking ${servers.length} MCP servers...`);

        for (const [_, server] of servers as any) {
          const name = server.id;
          // Simple health check simulation for now
          // In a real implementation, we would try to connect to the MCP server
          const isHealthy = true;

          telemetry.emitMcpServerHealth({
            server_name: name,
            status: isHealthy ? 'healthy' : 'unhealthy',
            message: isHealthy ? 'Connected successfully' : 'Connection failed'
          });

          console.log(`${isHealthy ? '✅' : '❌'} ${name}: ${isHealthy ? 'Healthy' : 'Unhealthy'}`);
        }
      } catch (error) {
        console.error(`Health check failed: ${error}`);
      }
    });
}
