import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ALLOWED_CONFIDENCE = ['CONFIRMED', 'HIGH', 'MEDIUM', 'LOW'];
const REQUIRED_FILES = ['DOSSIER.md', 'EVIDENCE_MAP.md', 'BACKLOG.md', 'PR_STACK_PLAN.md'];

async function lintDossier() {
    const rootDir = path.resolve(__dirname, '../../');
    const competitiveDir = path.join(rootDir, 'docs/competitive');

    let entries;
    try {
        entries = await fs.readdir(competitiveDir, { withFileTypes: true });
    } catch (e) {
        console.error(`Error reading ${competitiveDir}:`, e);
        process.exit(1);
    }

    let hasErrors = false;

    for (const entry of entries) {
        if (!entry.isDirectory()) continue;
        if (entry.name === '_TEMPLATE') continue;
        if (entry.name.startsWith('.')) continue;

        const targetName = entry.name;
        const targetPath = path.join(competitiveDir, targetName);
        console.log(`Linting target: ${targetName}...`);

        // 1. Check required files
        for (const file of REQUIRED_FILES) {
            try {
                await fs.access(path.join(targetPath, file));
            } catch {
                console.error(`[${targetName}] Missing required file: ${file}`);
                hasErrors = true;
            }
        }

        // 2. Validate EVIDENCE_MAP.md
        try {
            const evidenceContent = await fs.readFile(path.join(targetPath, 'EVIDENCE_MAP.md'), 'utf-8');
            const lines = evidenceContent.split('\n');

            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('|')) continue;
                if (trimmed.includes('---')) continue; // Separator
                if (trimmed.includes('| ID |')) continue; // Header

                // Split by pipe and remove first/last empty elements from split('|...|')
                const cols = line.split('|').slice(1, -1).map(c => c.trim());
                if (cols.length < 4) continue;

                const [id, claim, confidence, source, revalidate] = cols;

                // Check Confidence
                    if (!confidence || !ALLOWED_CONFIDENCE.includes(confidence)) {
                        console.error(`[${targetName}] Invalid/Missing confidence "${confidence}" in EVIDENCE_MAP.md (Claim ${id})`);
                        hasErrors = true;
                    }

                    // Check Source for Verified claims
                    if ((confidence === 'CONFIRMED' || confidence === 'HIGH') && (!source || !source.match(/https?:\/\//))) {
                        console.error(`[${targetName}] Claim ${id} is ${confidence} but missing URL source.`);
                        hasErrors = true;
                    }

                    // Check Revalidate By
                    // Expected: YYYY-MM-DD, next_major_release, never, or empty/undefined if strictness is low, but let's assume valid if present
                    if (revalidate) {
                         const validRevalidate = revalidate === 'next_major_release' || revalidate === 'never' || revalidate.match(/^\d{4}-\d{2}-\d{2}$/);
                         if (!validRevalidate) {
                             console.error(`[${targetName}] Invalid revalidate_by "${revalidate}" in EVIDENCE_MAP.md (Claim ${id})`);
                             hasErrors = true;
                         }
                    }
            }
        } catch (e) {
            // File might be missing, already handled
        }

        // 3. Validate DOSSIER.md (Determinism & Negative Space)
        try {
            const dossierContent = await fs.readFile(path.join(targetPath, 'DOSSIER.md'), 'utf-8');

            // Check for timestamps (heuristic: 202X-XX-XX outside of known fields)
            if (dossierContent.match(/Last Updated.*:.*\d{4}-\d{2}-\d{2}/)) {
                 console.error(`[${targetName}] DOSSIER.md contains timestamp in "Last Updated". Use git history instead.`);
                 hasErrors = true;
            }

            // Check for Negative Space section
            if (!dossierContent.includes('Negative Space')) {
                 console.error(`[${targetName}] DOSSIER.md missing "Negative Space" section.`);
                 hasErrors = true;
            }

        } catch (e) {
            // Missing file
        }

        // 4. Validate PR_STACK_PLAN.md (Clean Room Assurance, Tests, Rollback)
        try {
            const prPlanContent = await fs.readFile(path.join(targetPath, 'PR_STACK_PLAN.md'), 'utf-8');
            const requiredPhrases = ['Clean-Room Check', '**Tests**:', '**Rollback**:'];
            for (const phrase of requiredPhrases) {
                 if (!prPlanContent.includes(phrase)) {
                      console.error(`[${targetName}] PR_STACK_PLAN.md missing "${phrase}".`);
                      hasErrors = true;
                 }
            }
        } catch (e) {}

    }

    if (hasErrors) {
        console.error('\nLinting failed.');
        process.exit(1);
    } else {
        console.log('\nLinting passed.');
    }
}

lintDossier();
