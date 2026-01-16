import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';

function sh(cmd: string, dryRun: boolean = false): string {
    if (dryRun) {
        console.log(`[Dry Run] ${cmd}`);
        return '';
    }
    try {
        return execSync(cmd, { stdio: 'pipe', encoding: 'utf-8' }).trim();
    } catch (error: any) {
        console.error(`Error executing command: ${cmd}`);
        throw error;
    }
}

async function main() {
    const args = process.argv.slice(2);
    const dryRun = args.includes('--dry-run');
    const patchFile = args.find(a => !a.startsWith('--'));

    if (!patchFile) {
        console.error('Usage: tsx scripts/autonomy/open_pr.ts <patch_file> [--dry-run]');
        process.exit(1);
    }

    if (!fs.existsSync(patchFile)) {
        console.error(`Patch file not found: ${patchFile}`);
        process.exit(1);
    }

    const patchId = path.basename(patchFile, '.diff');
    const branchName = `autonomy/patch/${patchId}-${Date.now()}`;
    const title = `[AUTONOMY] Remediation for ${patchId}`;
    const body = `This PR applies remediation patch ${patchId}.\n\nTriggered automatically by Assurance-Driven Autonomy.`;

    console.log(`Processing PR for ${patchFile}...`);

    try {
        // 1. Create branch
        sh(`git checkout -b ${branchName}`, dryRun);

        // 2. Apply patch
        if (dryRun) {
            console.log(`[Dry Run] Would apply patch ${patchFile}`);
        } else {
            sh(`git apply ${patchFile}`);
        }

        // 3. Commit
        sh(`git add .`, dryRun);
        sh(`git commit -m "${title}"`, dryRun);

        // 4. Push
        sh(`git push origin ${branchName}`, dryRun);

        // 5. Open PR
        const prCmd = `gh pr create --title "${title}" --body "${body}" --head ${branchName} --base main --label "autonomy"`;
        const prUrl = sh(prCmd, dryRun);

        if (!dryRun) {
            console.log(`PR Created: ${prUrl}`);

            // Generate artifact
            const outputDir = path.dirname(patchFile);
            const proposedPrsFile = path.join(outputDir, '../proposed-prs.json'); // Assuming structure
            let proposedPrs: any[] = [];
            if (fs.existsSync(proposedPrsFile)) {
                proposedPrs = JSON.parse(fs.readFileSync(proposedPrsFile, 'utf8'));
            }
            proposedPrs.push({
                patch_id: patchId,
                branch: branchName,
                pr_url: prUrl,
                timestamp: new Date().toISOString()
            });
            fs.writeFileSync(proposedPrsFile, JSON.stringify(proposedPrs, null, 2));
        }

    } catch (e) {
        console.error('Failed to open PR:', e);
    } finally {
        // Cleanup: switch back to main
        if (!dryRun) {
            try {
                sh(`git checkout main`);
            } catch {}
        }
    }
}

main();
