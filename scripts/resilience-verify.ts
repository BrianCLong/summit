
import { spawn } from 'child_process';
import path from 'path';
import fs from 'fs';

async function runCommand(command: string, args: string[]) {
    console.log(`Running: ${command} ${args.join(' ')}`);
    return new Promise<void>((resolve, reject) => {
        const proc = spawn(command, args, { stdio: 'inherit', shell: true });
        proc.on('close', (code) => {
            if (code === 0) resolve();
            else reject(new Error(`Command failed with code ${code}`));
        });
    });
}

async function main() {
    const distDir = path.resolve('dist/resilience');
    if (!fs.existsSync(distDir)) {
        fs.mkdirSync(distDir, { recursive: true });
    }

    // Set verify environment
    process.env.DR_REPORT_DIR = distDir;

    try {
        console.log('--- RESILIENCE VERIFICATION START ---');

        // 1. DR Drill Dry-Run
        console.log('\n[1/3] Running DR Drill (Dry Run)...');
        await runCommand('npx', [
            'tsx',
            'server/src/dr/cli.ts',
            'server/src/dr/plans/backup-restore.json',
            'dry-run'
        ]);

        // 2. Backup Integrity Simulation
        console.log('\n[2/3] Running Backup Integrity Simulation...');
        // We run the test suite as it contains the simulation logic
        await runCommand('npx', [
            'tsx',
            'server/src/backup/BackupIntegrityVerifier.test.ts'
        ]);

        // 3. Partitioning Service Verification
        console.log('\n[3/3] Verifying Partitioning DDL Generation...');
        await runCommand('npx', [
            'tsx',
            'server/src/tenancy/PartitioningService.test.ts'
        ]);

        console.log('\n--- RESILIENCE VERIFICATION SUCCESS ---');
        console.log(`Artifacts available in ${distDir}`);

        // Generate summary artifact
        const summary = {
            timestamp: new Date().toISOString(),
            status: 'success',
            drReport: path.join(distDir, 'drill-report.json')
        };
        fs.writeFileSync(path.join(distDir, 'summary.json'), JSON.stringify(summary, null, 2));

    } catch (e: any) {
        console.error('\n--- RESILIENCE VERIFICATION FAILED ---');
        console.error(e.message);
        process.exit(1);
    }
}

main();
