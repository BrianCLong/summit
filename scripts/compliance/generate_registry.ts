
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';

const registryPath = path.join(process.cwd(), 'governance/registry.json');
const governanceDir = path.join(process.cwd(), 'governance');

interface RegistryArtifact {
    id: string;
    type: string;
    name: string;
    path: string;
    hash: string;
    state: string;
}

function calculateHash(filepath: string): string {
    const content = fs.readFileSync(filepath, 'utf-8');
    return crypto.createHash('sha256').update(content).digest('hex');
}

function scanDirectory(dir: string, type: string): RegistryArtifact[] {
    if (!fs.existsSync(dir)) return [];

    const artifacts: RegistryArtifact[] = [];
    const files = fs.readdirSync(dir);

    for (const file of files) {
        if (file.endsWith('.json') && file !== 'registry.json') {
            const filepath = path.join(dir, file);
            artifacts.push({
                id: crypto.randomUUID(),
                type: type,
                name: file,
                path: path.relative(process.cwd(), filepath),
                hash: calculateHash(filepath),
                state: 'approved' // Defaulting to approved for existing governed artifacts
            });
        }
    }
    return artifacts;
}

const artifacts = [
    ...scanDirectory(governanceDir, 'governance_config'),
    // ...scanDirectory(path.join(process.cwd(), 'policy'), 'policy')
];

const registry = {
    version: "1.0.0",
    generated_at: new Date().toISOString(),
    artifacts: artifacts
};

fs.writeFileSync(registryPath, JSON.stringify(registry, null, 2));
console.log(`✅ Registry generated with ${artifacts.length} artifacts.`);
