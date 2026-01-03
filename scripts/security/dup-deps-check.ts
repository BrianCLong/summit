import { execSync } from 'child_process';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const ROOT_DIR = path.resolve(__dirname, '../../');

console.log('🔍 Checking for Duplicate Dependency Versions across workspaces...');

try {
    const listOutput = execSync('pnpm list -r --json', {
        cwd: ROOT_DIR,
        encoding: 'utf8',
        maxBuffer: 100 * 1024 * 1024 // 100MB
    });
    const projects = JSON.parse(listOutput);

    const depMap = new Map();

    projects.forEach(project => {
        const allDeps = {
            ...(project.dependencies || {}),
            ...(project.devDependencies || {}),
            ...(project.optionalDependencies || {}),
        };

        for (const [name, info] of Object.entries(allDeps)) {
            if (!depMap.has(name)) depMap.set(name, new Set());
            depMap.get(name).add(info.version);
        }
    });

    let duplicatesFound = 0;
    const report = [];

    for (const [name, versions] of depMap.entries()) {
        if (versions.size > 1 && !name.startsWith('@intelgraph/')) {
            duplicatesFound++;
            report.push(`- **${name}**: ${Array.from(versions).join(', ')}`);
        }
    }

    if (duplicatesFound > 0) {
        console.log(`⚠️  Found ${duplicatesFound} dependencies with multiple versions:`);
        report.slice(0, 20).forEach(line => console.log(line));
        if (report.length > 20) console.log('... (and more)');

        // Save to evidence
        const evidenceDir = path.join(ROOT_DIR, 'evidence/security');
        if (!fs.existsSync(evidenceDir)) fs.mkdirSync(evidenceDir, { recursive: true });
        fs.writeFileSync(path.join(evidenceDir, 'duplicate-deps.md'), `# Duplicate Dependencies\n\n${report.join('\n')}`);
        console.log(`\n📄 Detailed report saved to evidence/security/duplicate-deps.md`);
    } else {
        console.log('✅ No duplicate dependency versions found.');
    }

} catch (e) {
    console.error('❌ Failed to check for duplicates:', e.message);
}
