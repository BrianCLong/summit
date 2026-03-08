"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.modalityFitCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
exports.modalityFitCommand = new commander_1.Command('modality-fit')
    .description('Validate AI Modality Fit')
    .option('-f, --file <path>', 'Path to evidence file', 'evidence/ai_task_profile.json')
    .action(async (options) => {
    console.log(chalk_1.default.blue('Checking AI Modality Fit...'));
    const filePath = path_1.default.resolve(process.cwd(), options.file);
    if (!fs_1.default.existsSync(filePath)) {
        console.error(chalk_1.default.red(`Error: Evidence file not found at ${filePath}`));
        process.exit(1);
    }
    try {
        const data = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        const requiredFields = ["task_type", "output_determinism_required", "regulatory_exposure", "chosen_modality"];
        const missing = requiredFields.filter(f => !(f in data));
        if (missing.length > 0) {
            console.error(chalk_1.default.red(`Schema Error: Missing fields: ${missing.join(', ')}`));
            process.exit(1);
        }
        console.log(chalk_1.default.green(`✓ Task: ${data.task_type}`));
        console.log(chalk_1.default.green(`✓ Modality: ${data.chosen_modality}`));
        // Rule: GenAI + Determinism = Fail
        if (data.output_determinism_required && data.chosen_modality === 'genai') {
            console.error(chalk_1.default.red('Error: Modality Mismatch!'));
            console.error(chalk_1.default.red('  Reason: GenAI cannot guarantee required output determinism.'));
            console.error(chalk_1.default.yellow('  Suggestion: Use predictive/symbolic AI or remove determinism requirement.'));
            process.exit(1);
        }
        console.log(chalk_1.default.green('AI Modality Fit Check Passed!'));
    }
    catch (e) {
        console.error(chalk_1.default.red(`Error parsing JSON: ${e.message}`));
        process.exit(1);
    }
});
