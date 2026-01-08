
import { DrillOrchestrator } from './orchestrator/DrillOrchestrator.js';
import path from 'path';
import fs from 'fs';
import logger from '../config/logger.js';

async function main() {
    const args = process.argv.slice(2);
    if (args.length < 2) {
        console.log('Usage: npx tsx server/src/dr/cli.ts <plan-file> <mode>');
        console.log('Modes: dry-run, execute, verify-only');
        process.exit(1);
    }

    const [planFile, mode] = args;

    if (!['dry-run', 'execute', 'verify-only'].includes(mode)) {
        console.error('Invalid mode. Must be dry-run, execute, or verify-only');
        process.exit(1);
    }

    const orchestrator = new DrillOrchestrator();

    try {
        const planPath = path.resolve(planFile);
        if (!fs.existsSync(planPath)) {
             throw new Error(`Plan file not found: ${planPath}`);
        }

        const plan = await orchestrator.loadPlan(planPath);
        const report = await orchestrator.executeDrill(plan, mode as any);

        console.log(`Drill completed. Success: ${report.success}`);
        console.log(`Report saved to dist/dr/`);

        if (!report.success) process.exit(1);
    } catch (e: any) {
        logger.error('Drill execution failed', e);
        process.exit(1);
    }
}

if (import.meta.url === `file://${process.argv[1]}`) {
    main();
}
