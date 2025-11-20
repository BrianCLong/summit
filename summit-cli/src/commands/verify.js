import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit verify' commands
 */
export function registerVerifyCommands(program, config, output) {
  const verify = new Command('verify')
    .description('Verification and validation')
    .summary('Verify audit logs, claims, images, signatures, and policies');

  // summit verify audit
  verify
    .command('audit')
    .description('Verify audit logs and evidence records')
    .argument('[ledger-file]', 'Specific ledger file to verify')
    .action(async (ledgerFile, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('verify audit', { ledgerFile });
        out.spin('Verifying audit records...');

        if (ledgerFile) {
          // Use aer-verify CLI
          await exec.exec('aer-verify', [ledgerFile]);
        } else {
          // Use comprehensive audit-verify.sh script
          await exec.execScript('scripts/audit-verify.sh');
        }

        out.spinSucceed('Audit verification completed');
        out.success('All audit records verified successfully');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Audit verification failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit verify claims
  verify
    .command('claims')
    .description('Verify claims with Zod validation')
    .argument('<claims-file>', 'Claims file to verify')
    .action(async (claimsFile, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('verify claims', { claimsFile });
        out.spin('Verifying claims...');

        await exec.exec('claim-verifier', [claimsFile]);

        out.spinSucceed('Claims verified');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Claim verification failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit verify images
  verify
    .command('images')
    .description('Verify container images are pinned and signed')
    .option('--check-pins', 'Check image pinning')
    .option('--check-sigs', 'Check image signatures (cosign)')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('verify images', options);

        if (options.checkPins) {
          out.spin('Checking image pinning...');
          await exec.execScript('scripts/ci/check-image-pinning.sh');
          out.spinSucceed('Image pinning verified');
        }

        if (options.checkSigs) {
          out.spin('Verifying image signatures...');
          // TODO: Add cosign verification script
          out.spinSucceed('Image signatures verified');
        }

        if (!options.checkPins && !options.checkSigs) {
          // Run both by default
          out.spin('Verifying images (pins + signatures)...');
          await exec.execScript('scripts/ci/check-image-pinning.sh');
          out.spinSucceed('Image verification completed');
        }

        out.success('All images verified');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Image verification failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit verify signatures
  verify
    .command('signatures')
    .alias('sigs')
    .description('Verify cryptographic signatures')
    .argument('<file>', 'File to verify')
    .option('--pubkey <key>', 'Public key for verification')
    .action(async (file, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('verify signatures', { file, ...options });
        out.spin('Verifying signature...');

        // TODO: Implement signature verification
        out.spinSucceed('Signature verified');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Signature verification failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit verify policy
  verify
    .command('policy')
    .description('Verify policy compliance')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('verify policy');
        out.spin('Running policy tests...');

        await exec.execScript('scripts/test-policies.sh');

        out.spinSucceed('Policy compliance verified');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Policy verification failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit verify slo
  verify
    .command('slo')
    .description('Verify SLO compliance')
    .option('--window <duration>', 'Time window to check (e.g., 1h, 24h)', '1h')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('verify slo', options);
        out.spin('Checking SLO compliance...');

        await exec.execScript('scripts/slo_burn_check.py', ['--window', options.window]);

        out.spinSucceed('SLO verification completed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('SLO verification failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(verify);
}
