import { Command } from 'commander';
import { Executor } from '../lib/executor.js';
import { join } from 'path';

/**
 * Register 'summit doctor' command
 */
export function registerDoctorCommand(program, config, output) {
  program
    .command('doctor')
    .description('Run system diagnostics and health checks')
    .option('--verbose', 'Show detailed diagnostic information')
    .option('--fix', 'Attempt to fix common issues')
    .action(async (options, command) => {
      const out = command.parent._output;
      const cfg = command.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('doctor', options);
        out.info('Running Summit system diagnostics...');

        const checks = [];

        // Check 1: Required tools
        out.spin('Checking required tools...');
        const requiredTools = [
          'node',
          'pnpm',
          'docker',
          'docker compose',
          'git',
          'make',
          'just',
        ];

        const toolResults = {};
        for (const tool of requiredTools) {
          const cmd = tool.split(' ')[0];
          const exists = await exec.commandExists(cmd);
          toolResults[tool] = exists;

          if (!exists && out.verbose) {
            out.warning(`Missing: ${tool}`);
          }
        }

        const missingTools = Object.entries(toolResults)
          .filter(([_, exists]) => !exists)
          .map(([tool]) => tool);

        if (missingTools.length === 0) {
          out.spinSucceed('All required tools are installed');
          checks.push({ name: 'Required tools', status: 'pass', issues: [] });
        } else {
          out.spinFail(`Missing tools: ${missingTools.join(', ')}`);
          checks.push({
            name: 'Required tools',
            status: 'fail',
            issues: missingTools.map((t) => `Missing: ${t}`),
          });
        }

        // Check 2: Node version
        out.spin('Checking Node.js version...');
        const nodeVersion = process.versions.node;
        const majorVersion = parseInt(nodeVersion.split('.')[0], 10);

        if (majorVersion >= 20) {
          out.spinSucceed(`Node.js version: ${nodeVersion}`);
          checks.push({ name: 'Node.js version', status: 'pass', version: nodeVersion });
        } else {
          out.spinFail(`Node.js version too old: ${nodeVersion} (requires >= 20)`);
          checks.push({
            name: 'Node.js version',
            status: 'fail',
            version: nodeVersion,
            issues: ['Requires Node.js >= 20'],
          });
        }

        // Check 3: Docker daemon
        out.spin('Checking Docker daemon...');
        try {
          await exec.exec('docker', ['info'], { stdio: 'pipe' });
          out.spinSucceed('Docker daemon is running');
          checks.push({ name: 'Docker daemon', status: 'pass' });
        } catch (error) {
          out.spinFail('Docker daemon is not running');
          checks.push({
            name: 'Docker daemon',
            status: 'fail',
            issues: ['Docker daemon is not running. Start Docker Desktop or dockerd'],
          });
        }

        // Check 4: Docker Compose services
        out.spin('Checking development services...');
        const services = await exec.getComposeStatus();

        if (services.length === 0) {
          out.spinFail('No services running (use: summit dev up)');
          checks.push({
            name: 'Development services',
            status: 'warn',
            issues: ['No services running'],
          });
        } else {
          const unhealthy = services.filter(
            (s) => s.State !== 'running' || (s.Health && s.Health !== 'healthy')
          );

          if (unhealthy.length === 0) {
            out.spinSucceed(`${services.length} services healthy`);
            checks.push({ name: 'Development services', status: 'pass', count: services.length });
          } else {
            out.spinFail(`${unhealthy.length} services unhealthy`);
            checks.push({
              name: 'Development services',
              status: 'fail',
              issues: unhealthy.map((s) => `${s.Service || s.Name}: ${s.State} (${s.Health})`),
            });
          }
        }

        // Check 5: Database connectivity
        out.spin('Checking database connectivity...');
        try {
          const pgCheck = await exec.exec('docker', ['compose', 'exec', '-T', 'postgres', 'pg_isready'], {
            stdio: 'pipe',
            ignoreExitCode: true,
          });

          if (pgCheck.exitCode === 0) {
            out.spinSucceed('PostgreSQL is ready');
            checks.push({ name: 'PostgreSQL', status: 'pass' });
          } else {
            out.spinFail('PostgreSQL is not ready');
            checks.push({
              name: 'PostgreSQL',
              status: 'fail',
              issues: ['PostgreSQL is not accepting connections'],
            });
          }
        } catch (error) {
          out.spinFail('Cannot connect to PostgreSQL');
          checks.push({
            name: 'PostgreSQL',
            status: 'fail',
            issues: ['Cannot connect to PostgreSQL container'],
          });
        }

        // Check 6: Node modules installed
        out.spin('Checking dependencies...');
        try {
          const nodeModulesExist = await exec.commandExists('test');
          const checkResult = await exec.exec('test', ['-d', 'node_modules'], {
            stdio: 'pipe',
            ignoreExitCode: true,
          });

          if (checkResult.exitCode === 0) {
            out.spinSucceed('Dependencies installed');
            checks.push({ name: 'Dependencies', status: 'pass' });
          } else {
            out.spinFail('Dependencies not installed (run: pnpm install)');
            checks.push({
              name: 'Dependencies',
              status: 'fail',
              issues: ['node_modules not found. Run: pnpm install'],
            });
          }
        } catch (error) {
          out.spinFail('Dependencies check failed');
          checks.push({
            name: 'Dependencies',
            status: 'warn',
            issues: ['Could not verify dependencies'],
          });
        }

        // Check 7: Environment variables
        out.spin('Checking environment configuration...');
        const requiredEnvVars = ['NODE_ENV'];
        const missingEnvVars = requiredEnvVars.filter((v) => !process.env[v]);

        if (missingEnvVars.length === 0) {
          out.spinSucceed('Environment configured');
          checks.push({ name: 'Environment', status: 'pass' });
        } else {
          out.spinFail(`Missing env vars: ${missingEnvVars.join(', ')}`);
          checks.push({
            name: 'Environment',
            status: 'warn',
            issues: missingEnvVars.map((v) => `Missing: ${v}`),
          });
        }

        // Check 8: Disk space
        out.spin('Checking disk space...');
        try {
          const dfResult = await exec.exec('df', ['-h', '.'], { stdio: 'pipe' });
          const lines = dfResult.stdout.split('\n');
          if (lines.length > 1) {
            const parts = lines[1].split(/\s+/);
            const usagePercent = parseInt(parts[4], 10);

            if (usagePercent < 90) {
              out.spinSucceed(`Disk usage: ${usagePercent}%`);
              checks.push({ name: 'Disk space', status: 'pass', usage: usagePercent });
            } else {
              out.spinFail(`Disk usage critical: ${usagePercent}%`);
              checks.push({
                name: 'Disk space',
                status: 'fail',
                usage: usagePercent,
                issues: ['Disk usage above 90%'],
              });
            }
          }
        } catch (error) {
          out.spinFail('Cannot check disk space');
          checks.push({ name: 'Disk space', status: 'warn', issues: ['Could not check disk space'] });
        }

        // Summary
        const passed = checks.filter((c) => c.status === 'pass').length;
        const failed = checks.filter((c) => c.status === 'fail').length;
        const warnings = checks.filter((c) => c.status === 'warn').length;

        out.info(`\nDiagnostics complete: ${passed} passed, ${failed} failed, ${warnings} warnings`);

        if (failed > 0) {
          out.error('Some critical checks failed. System may not function correctly.');

          if (options.fix) {
            out.info('Attempting to fix common issues...');
            // TODO: Implement auto-fix logic
            out.warning('Auto-fix not yet implemented');
          } else {
            out.info('Run with --fix to attempt automatic fixes');
          }
        } else if (warnings > 0) {
          out.warning('Some checks have warnings. Review issues above.');
        } else {
          out.success('All systems operational! 🚀');
        }

        // Output results in machine-readable format
        out.endCommand(failed === 0, { checks, summary: { passed, failed, warnings } });

        if (failed > 0) {
          process.exit(1);
        }
      } catch (error) {
        out.spinStop();
        out.error('Diagnostic checks failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });
}
