import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const findRepoRoot = (dir) => {
  if (fs.existsSync(path.join(dir, 'package.json'))) return dir;
  const parent = path.dirname(dir);
  if (parent === dir) throw new Error('Could not find repo root');
  return findRepoRoot(parent);
};

const REPO_ROOT = findRepoRoot(__dirname);
const EVIDENCE_BASE_DIR = path.join(REPO_ROOT, 'evidence/security-posture');
const CONFIG_PATH = path.join(REPO_ROOT, 'scripts/security/security-verify.config.json');

// Ensure evidence directory exists
const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
const EVIDENCE_DIR = path.join(EVIDENCE_BASE_DIR, timestamp);

if (!fs.existsSync(EVIDENCE_DIR)) {
  fs.mkdirSync(EVIDENCE_DIR, { recursive: true });
}

// Default config if not exists
const defaultConfig = {
    commands: [
        "security:check",
        "verify:governance",
        "check:governance"
    ]
};

const getConfig = () => {
    if (fs.existsSync(CONFIG_PATH)) {
        return JSON.parse(fs.readFileSync(CONFIG_PATH, 'utf8'));
    }
    return defaultConfig;
};

const runVerification = () => {
    const config = getConfig();
    const manifest = {
        timestamp: new Date().toISOString(),
        commands_run: [],
        outcomes: {}
    };

    console.log(`Starting security verification run at ${EVIDENCE_DIR}`);

    config.commands.forEach(cmd => {
        const sanitizedCmdName = cmd.replace(/[^a-zA-Z0-9_-]/g, '_');
        const outputFile = path.join(EVIDENCE_DIR, `${sanitizedCmdName}.log`);

        console.log(`Running: pnpm ${cmd}`);
        manifest.commands_run.push(cmd);

        try {
            // We use execSync to capture output.
            // Note: This assumes pnpm is available in env.
            // Using stdio pipe to capture output.
            const output = execSync(`pnpm ${cmd}`, {
                cwd: REPO_ROOT,
                encoding: 'utf8',
                stdio: ['ignore', 'pipe', 'pipe'] // stdin, stdout, stderr
            });

            fs.writeFileSync(outputFile, output);
            manifest.outcomes[cmd] = 'SUCCESS';
            console.log(`  -> Success. Output saved to ${path.relative(REPO_ROOT, outputFile)}`);

        } catch (error) {
            const combinedOutput = (error.stdout || '') + '\n' + (error.stderr || '');
            fs.writeFileSync(outputFile, combinedOutput);
            manifest.outcomes[cmd] = 'FAILURE';
            console.error(`  -> Failed. Output saved to ${path.relative(REPO_ROOT, outputFile)}`);
        }
    });

    // Capture environment info (sanitized)
    const envInfo = {
        nodeVersion: process.version,
        platform: process.platform,
        // Do not dump all env vars to avoid leaking secrets
    };
    fs.writeFileSync(path.join(EVIDENCE_DIR, 'environment.json'), JSON.stringify(envInfo, null, 2));

    // Create Index
    let indexContent = `# Security Posture Verification Report\n\n`;
    indexContent += `**Run Timestamp:** ${manifest.timestamp}\n\n`;
    indexContent += `## Summary\n\n`;
    indexContent += `| Command | Outcome | Log |\n`;
    indexContent += `| :--- | :--- | :--- |\n`;

    config.commands.forEach(cmd => {
        const sanitizedCmdName = cmd.replace(/[^a-zA-Z0-9_-]/g, '_');
        const outcome = manifest.outcomes[cmd];
        const logLink = `./${sanitizedCmdName}.log`;
        indexContent += `| \`${cmd}\` | **${outcome}** | [View Log](${logLink}) |\n`;
    });

    fs.writeFileSync(path.join(EVIDENCE_DIR, 'INDEX.md'), indexContent);
    console.log(`Verification complete. Index written to ${path.join(EVIDENCE_DIR, 'INDEX.md')}`);
};

runVerification();
