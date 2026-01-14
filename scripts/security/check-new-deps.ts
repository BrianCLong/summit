
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, '../../');

// We use the root package.json as the baseline for now,
// or ideally we compare against a committed snapshot.
// For this MVP, we will just dump the current deps and say "Review these if they change".
// A better differentiator is to check against a 'known good' list.

const ALLOWED_DEPS_FILE = path.join(rootDir, 'security/allowed-deps.json');
const ROOT_PKG = path.join(rootDir, 'package.json');
// We should also check server/package.json if it exists
const SERVER_PKG = path.join(rootDir, 'server/package.json');

async function getDependencies(pkgPath: string) {
  if (!fs.existsSync(pkgPath)) return {};
  const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'));
  return { ...pkg.dependencies, ...pkg.devDependencies };
}

async function main() {
  const rootDeps = await getDependencies(ROOT_PKG);
  const serverDeps = await getDependencies(SERVER_PKG);

  const allDeps = { ...rootDeps, ...serverDeps };
  const currentDeps = Object.keys(allDeps).sort();

  if (!fs.existsSync(ALLOWED_DEPS_FILE)) {
    console.log('No allowed-deps.json found. Creating baseline...');
    if (!fs.existsSync(path.dirname(ALLOWED_DEPS_FILE))) {
        fs.mkdirSync(path.dirname(ALLOWED_DEPS_FILE), { recursive: true });
    }
    fs.writeFileSync(ALLOWED_DEPS_FILE, JSON.stringify(currentDeps, null, 2));
    console.log(`Baseline created with ${currentDeps.length} dependencies.`);
    return;
  }

  const allowedDeps = JSON.parse(fs.readFileSync(ALLOWED_DEPS_FILE, 'utf-8'));
  const allowedSet = new Set(allowedDeps);

  const newDeps = currentDeps.filter(d => !allowedSet.has(d));

  if (newDeps.length > 0) {
    console.error('ERROR: New dependencies detected that are not in the allowlist:');
    newDeps.forEach(d => console.error(` - ${d}`));
    console.error('\nPlease audit these dependencies and update security/allowed-deps.json if approved.');
    process.exit(1);
  } else {
    console.log('Dependency check passed. No new unapproved dependencies.');
  }
}

main().catch(err => {
  console.error(err);
  process.exit(1);
});
