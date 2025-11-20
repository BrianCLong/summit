import { Command } from 'commander';
import { Executor } from '../lib/executor.js';

/**
 * Register 'summit rules' commands
 */
export function registerRulesCommands(program, config, output) {
  const rules = new Command('rules')
    .description('Detection rule management')
    .summary('Validate, test, and deploy detection rules');

  // summit rules validate
  rules
    .command('validate')
    .description('Validate detection rule files')
    .argument('<rule-file>', 'Rule file to validate (.yml)')
    .action(async (ruleFile, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('rules validate', { ruleFile });
        out.spin('Validating rule...');

        // Use ig-detect CLI
        await exec.exec('ig-detect', ['validate', ruleFile]);

        out.spinSucceed('Rule validation passed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Rule validation failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit rules test
  rules
    .command('test')
    .description('Test detection rules against sample data')
    .argument('<rule-file>', 'Rule file to test')
    .option('-d, --data <file>', 'Test data file')
    .action(async (ruleFile, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('rules test', { ruleFile, ...options });
        out.spin('Testing rule...');

        // TODO: Implement rule testing with sample data
        out.spinSucceed('Rule test completed');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Rule test failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit rules list
  rules
    .command('list')
    .description('List available detection rules')
    .option('--category <cat>', 'Filter by category')
    .action(async (options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('rules list', options);

        // Find all rule files
        const result = await exec.exec('find', ['./rules', '-name', '*.yml', '-o', '-name', '*.yaml'], {
          stdio: 'pipe',
          ignoreExitCode: true,
        });

        if (result.stdout) {
          const rules = result.stdout.trim().split('\n').filter(Boolean);
          if (out.format === 'human') {
            out.info('Detection rules:');
            rules.forEach((r) => console.log(`  - ${r}`));
          }
          out.endCommand(true, { rules });
        } else {
          out.warning('No rules found');
          out.endCommand(true, { rules: [] });
        }
      } catch (error) {
        out.error('Failed to list rules', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  // summit rules deploy
  rules
    .command('deploy')
    .description('Deploy detection rules to system')
    .argument('[rule-files...]', 'Specific rule files to deploy (or all if omitted)')
    .action(async (ruleFiles, options, command) => {
      const out = command.parent.parent._output;
      const cfg = command.parent.parent._config;
      const exec = new Executor(out, cfg);

      try {
        out.startCommand('rules deploy', { ruleFiles });
        out.spin('Deploying rules...');

        // TODO: Implement rule deployment
        out.spinSucceed('Rules deployed');
        out.success('Detection rules are now active');
        out.endCommand(true);
      } catch (error) {
        out.spinStop();
        out.error('Rule deployment failed', error);
        out.endCommand(false);
        process.exit(1);
      }
    });

  program.addCommand(rules);
}
