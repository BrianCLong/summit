"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiMaturityCommand = void 0;
const commander_1 = require("commander");
const chalk_1 = __importDefault(require("chalk"));
const fs_1 = __importDefault(require("fs"));
const path_1 = __importDefault(require("path"));
const STAGES = [
    'stage_1_experiment',
    'stage_2_pilot',
    'stage_3_operational',
    'stage_4_future_ready'
];
exports.aiMaturityCommand = new commander_1.Command('ai-maturity')
    .description('Validate AI Maturity evidence')
    .option('-f, --file <path>', 'Path to evidence file', 'evidence/ai_maturity.json')
    .option('--min-stage <stage>', 'Minimum required stage')
    .action(async (options) => {
    console.log(chalk_1.default.blue('Checking AI Maturity...'));
    const filePath = path_1.default.resolve(process.cwd(), options.file);
    if (!fs_1.default.existsSync(filePath)) {
        console.error(chalk_1.default.red(`Error: Evidence file not found at ${filePath}`));
        process.exit(1);
    }
    try {
        const data = JSON.parse(fs_1.default.readFileSync(filePath, 'utf-8'));
        const requiredFields = ["stage", "decision_rights_defined", "model_inventory_present", "runtime_monitoring", "owner_role"];
        const missing = requiredFields.filter(f => !(f in data));
        if (missing.length > 0) {
            console.error(chalk_1.default.red(`Schema Error: Missing fields: ${missing.join(', ')}`));
            process.exit(1);
        }
        const stageIndex = STAGES.indexOf(data.stage);
        if (stageIndex === -1) {
            console.error(chalk_1.default.red(`Error: Invalid stage '${data.stage}'`));
            process.exit(1);
        }
        console.log(chalk_1.default.green(`✓ Current stage: ${data.stage}`));
        // Business Rules for Operational+ stages
        if (stageIndex >= 2) {
            const failures = [];
            if (!data.runtime_monitoring)
                failures.push('runtime_monitoring');
            if (!data.decision_rights_defined)
                failures.push('decision_rights_defined');
            if (!data.model_inventory_present)
                failures.push('model_inventory_present');
            if (failures.length > 0) {
                console.error(chalk_1.default.red(`Error: Stage ${data.stage} requires the following controls: ${failures.join(', ')}`));
                process.exit(1);
            }
        }
        // Min Stage Check
        if (options.minStage) {
            const minStageIndex = STAGES.indexOf(options.minStage);
            if (minStageIndex === -1) {
                console.error(chalk_1.default.red(`Error: Invalid min-stage '${options.minStage}'`));
                process.exit(1);
            }
            if (stageIndex < minStageIndex) {
                console.error(chalk_1.default.red(`Error: Current stage ${data.stage} is below required minimum ${options.minStage}`));
                process.exit(1);
            }
            console.log(chalk_1.default.green(`✓ Meets minimum stage requirement (${options.minStage})`));
        }
        console.log(chalk_1.default.green('AI Maturity Check Passed!'));
    }
    catch (e) {
        console.error(chalk_1.default.red(`Error parsing JSON: ${e.message}`));
        process.exit(1);
    }
});
