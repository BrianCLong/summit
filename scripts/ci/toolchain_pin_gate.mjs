
import { readFileSync, existsSync } from 'node:fs';
import { join } from 'node:path';

export function auditToolchain(targetDir = process.cwd(), opts = {}) {
    const pkgPath = join(targetDir, 'package.json');
    if (!existsSync(pkgPath)) return true;
    const pkg = JSON.parse(readFileSync(pkgPath, 'utf8'));
    const nodeEngine = pkg.engines?.node;
    const packageManager = pkg.packageManager;
    const currentNodeVersion = opts.currentNodeVersion || process.version;
    const currentUserAgent = opts.userAgent !== undefined ? opts.userAgent : process.env.npm_config_user_agent;
    let passed = true;
    if (nodeEngine) {
        const currentMajor = parseInt(currentNodeVersion.slice(1).split('.')[0]);
        const engineMajor = parseInt(nodeEngine.replace(/^[^0-9]+/, ''));
        if (currentMajor !== engineMajor) {
            console.error(`❌ Node.js version mismatch: Current ${currentNodeVersion}, Expected ${nodeEngine}`);
            passed = false;
        }
    }
    if (packageManager && currentUserAgent) {
        if (!currentUserAgent.startsWith(packageManager.split('@')[0])) {
            console.error(`❌ Package Manager mismatch: Current agent "${currentUserAgent}", Expected "${packageManager}"`);
            passed = false;
        }
    }
    return passed;
}
