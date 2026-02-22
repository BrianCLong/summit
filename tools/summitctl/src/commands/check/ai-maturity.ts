import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

const STAGES = [
  'stage_1_experiment',
  'stage_2_pilot',
  'stage_3_operational',
  'stage_4_future_ready'
];

export const aiMaturityCommand = new Command('ai-maturity')
  .description('Validate AI Maturity evidence')
  .option('-f, --file <path>', 'Path to evidence file', 'evidence/ai_maturity.json')
  .option('--min-stage <stage>', 'Minimum required stage')
  .action(async (options) => {
    console.log(chalk.blue('Checking AI Maturity...'));
    const filePath = path.resolve(process.cwd(), options.file);

    if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`Error: Evidence file not found at ${filePath}`));
        process.exit(1);
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const requiredFields = ["stage", "decision_rights_defined", "model_inventory_present", "runtime_monitoring", "owner_role"];
        const missing = requiredFields.filter(f => !(f in data));
        if (missing.length > 0) {
            console.error(chalk.red(`Schema Error: Missing fields: ${missing.join(', ')}`));
            process.exit(1);
        }

        const stageIndex = STAGES.indexOf(data.stage);
        if (stageIndex === -1) {
             console.error(chalk.red(`Error: Invalid stage '${data.stage}'`));
             process.exit(1);
        }

        console.log(chalk.green(`✓ Current stage: ${data.stage}`));

        // Business Rules for Operational+ stages
        if (stageIndex >= 2) {
            const failures: string[] = [];
            if (!data.runtime_monitoring) failures.push('runtime_monitoring');
            if (!data.decision_rights_defined) failures.push('decision_rights_defined');
            if (!data.model_inventory_present) failures.push('model_inventory_present');

            if (failures.length > 0) {
                 console.error(chalk.red(`Error: Stage ${data.stage} requires the following controls: ${failures.join(', ')}`));
                 process.exit(1);
            }
        }

        // Min Stage Check
        if (options.minStage) {
            const minStageIndex = STAGES.indexOf(options.minStage);
            if (minStageIndex === -1) {
                console.error(chalk.red(`Error: Invalid min-stage '${options.minStage}'`));
                process.exit(1);
            }

            if (stageIndex < minStageIndex) {
                 console.error(chalk.red(`Error: Current stage ${data.stage} is below required minimum ${options.minStage}`));
                 process.exit(1);
            }
            console.log(chalk.green(`✓ Meets minimum stage requirement (${options.minStage})`));
        }

        console.log(chalk.green('AI Maturity Check Passed!'));

    } catch (e: any) {
        console.error(chalk.red(`Error parsing JSON: ${e.message}`));
        process.exit(1);
    }
  });
