import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function main() {
    const target = process.argv[2];

    if (!target) {
        console.error('Usage: node init_dossier.mjs <target>');
        process.exit(1);
    }

    const rootDir = path.resolve(__dirname, '../../');
    const templateDir = path.join(rootDir, 'docs/competitive/_TEMPLATE');
    const targetDir = path.join(rootDir, 'docs/competitive', target);

    try {
        // Check if target exists
        try {
            await fs.access(targetDir);
            console.error(`Error: Target directory ${targetDir} already exists.`);
            process.exit(1);
        } catch {
            // Directory doesn't exist, proceed
        }

        // Create target directory
        await fs.mkdir(targetDir, { recursive: true });
        console.log(`Created directory: ${targetDir}`);

        // Read templates
        const files = await fs.readdir(templateDir);

        for (const file of files) {
            const content = await fs.readFile(path.join(templateDir, file), 'utf-8');
            const processedContent = content.replace(/{TARGET_NAME}/g, target)
                                            .replace(/{OWNER_AGENT}/g, 'Unassigned');

            await fs.writeFile(path.join(targetDir, file), processedContent);
            console.log(`Generated: ${path.join('docs/competitive', target, file)}`);
        }

        console.log('\nSuccess! Competitive dossier initialized.');
        console.log(`Next steps:\n1. Edit docs/competitive/${target}/DOSSIER.md\n2. Fill evidence in EVIDENCE_MAP.md`);

    } catch (error) {
        console.error('Failed to initialize dossier:', error);
        process.exit(1);
    }
}

main();
