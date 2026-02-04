import { Command } from 'commander';
import chalk from 'chalk';
import fs from 'fs';
import path from 'path';

export const modalityFitCommand = new Command('modality-fit')
  .description('Validate AI Modality Fit')
  .option('-f, --file <path>', 'Path to evidence file', 'evidence/ai_task_profile.json')
  .action(async (options) => {
    console.log(chalk.blue('Checking AI Modality Fit...'));
    const filePath = path.resolve(process.cwd(), options.file);

    if (!fs.existsSync(filePath)) {
        console.error(chalk.red(`Error: Evidence file not found at ${filePath}`));
        process.exit(1);
    }

    try {
        const data = JSON.parse(fs.readFileSync(filePath, 'utf-8'));

        const requiredFields = ["task_type", "output_determinism_required", "regulatory_exposure", "chosen_modality"];
        const missing = requiredFields.filter(f => !(f in data));
        if (missing.length > 0) {
            console.error(chalk.red(`Schema Error: Missing fields: ${missing.join(', ')}`));
            process.exit(1);
        }

        console.log(chalk.green(`✓ Task: ${data.task_type}`));
        console.log(chalk.green(`✓ Modality: ${data.chosen_modality}`));

        // Rule: GenAI + Determinism = Fail
        if (data.output_determinism_required && data.chosen_modality === 'genai') {
            console.error(chalk.red('Error: Modality Mismatch!'));
            console.error(chalk.red('  Reason: GenAI cannot guarantee required output determinism.'));
            console.error(chalk.yellow('  Suggestion: Use predictive/symbolic AI or remove determinism requirement.'));
            process.exit(1);
        }

        console.log(chalk.green('AI Modality Fit Check Passed!'));

    } catch (e: any) {
        console.error(chalk.red(`Error parsing JSON: ${e.message}`));
        process.exit(1);
    }
  });
