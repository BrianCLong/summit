import fs from 'node:fs';
import path from 'node:path';

const EXTENSIONS_DIR = path.resolve(process.cwd(), 'extensions');

function collectPackageJsons(dir, results = []) {
  if (!fs.existsSync(dir)) {
    return results;
  }
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  entries.forEach((entry) => {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      collectPackageJsons(fullPath, results);
    } else if (entry.isFile() && entry.name === 'package.json') {
      results.push(fullPath);
    }
  });
  return results;
}

function validatePackage(pkg, filePath) {
  const failures = [];
  if (typeof pkg.name !== 'string' || pkg.name.trim().length === 0) {
    failures.push(`${filePath} missing name.`);
  }
  const isVscodeExtension = Boolean(pkg.publisher || pkg.engines?.vscode || pkg.contributes);
  if (isVscodeExtension) {
    if (typeof pkg.publisher !== 'string' || pkg.publisher.trim().length === 0) {
      failures.push(`${filePath} missing publisher for VS Code extension.`);
    }
    if (!pkg.engines?.vscode || typeof pkg.engines.vscode !== 'string') {
      failures.push(`${filePath} missing engines.vscode for VS Code extension.`);
    }
  } else {
    if (typeof pkg.version !== 'string' || pkg.version.trim().length === 0) {
      failures.push(`${filePath} missing version for extension package.`);
    }
  }
  return failures;
}

function main() {
  if (!fs.existsSync(EXTENSIONS_DIR)) {
    console.log('No extensions directory present; skipping extension governance gate.');
    return;
  }

  const packageJsons = collectPackageJsons(EXTENSIONS_DIR);
  if (packageJsons.length === 0) {
    console.log('No extension packages detected; skipping extension governance gate.');
    return;
  }

  const failures = [];
  packageJsons.forEach((pkgPath) => {
    const raw = fs.readFileSync(pkgPath, 'utf8');
    const pkg = JSON.parse(raw);
    failures.push(...validatePackage(pkg, path.relative(process.cwd(), pkgPath)));
  });

  if (failures.length > 0) {
    failures.forEach((failure) => {
      console.error(`EXTENSION_COMPLIANCE_FAIL: ${failure}`);
    });
    process.exitCode = 1;
    return;
  }

  console.log(`Extension compliance verified. Packages: ${packageJsons.length}`);
}

main();
