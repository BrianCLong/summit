import { Command } from 'commander';
import { buildRegulatoryArtifacts } from '../lib/regulatory/builder.js';
import * as path from 'path';

export function registerRegulatoryCommands(program: Command) {
    const regulatory = program.command('regulatory')
        .description('Regulatory compliance automation tools');

    regulatory.command('build')
        .description('Build regulatory artifacts')
        .action(async () => {
            console.log('Building regulatory artifacts...');
            const outputDir = path.resolve(process.cwd(), 'artifacts/regulatory');
            await buildRegulatoryArtifacts(outputDir);
            console.log(`Artifacts built to ${outputDir}`);
        });

    regulatory.command('diff')
        .description('Diff regulatory artifacts against baseline')
        .option('--baseline <path>', 'Path to baseline artifacts')
        .action(async (options) => {
             console.log('Diffing artifacts...');
             console.log('Diff complete (placeholder)');
        });
}
