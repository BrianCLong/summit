#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { execSync } from 'child_process';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const templateDir = path.join(__dirname, '../templates/service');
const serviceName = process.argv[2];

if (!serviceName) {
  console.error('Usage: companyos-new-service <service-name>');
  process.exit(1);
}

const targetDir = path.join(process.cwd(), 'services', serviceName);

if (fs.existsSync(targetDir)) {
  console.error(`Error: Service ${serviceName} already exists at ${targetDir}`);
  process.exit(1);
}

console.log(`Creating service ${serviceName} at ${targetDir}...`);

// Recursive copy function
function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  const entries = fs.readdirSync(src, { withFileTypes: true });

  for (const entry of entries) {
    const srcPath = path.join(src, entry.name);
    const destPath = path.join(dest, entry.name);

    if (entry.isDirectory()) {
      if (entry.name === 'node_modules' || entry.name === 'dist') continue;
      copyDir(srcPath, destPath);
    } else {
      fs.copyFileSync(srcPath, destPath);
    }
  }
}

try {
    copyDir(templateDir, targetDir);

    // Update package.json
    const packageJsonPath = path.join(targetDir, 'package.json');
    const packageJson = JSON.parse(fs.readFileSync(packageJsonPath, 'utf-8'));
    packageJson.name = serviceName;
    fs.writeFileSync(packageJsonPath, JSON.stringify(packageJson, null, 2));

    // Handle CI workflow
    const ciTemplatePath = path.join(targetDir, 'ci.yml');
    if (fs.existsSync(ciTemplatePath)) {
      const workflowsDir = path.join(process.cwd(), '.github/workflows');
      if (fs.existsSync(workflowsDir)) {
         const ciContent = fs.readFileSync(ciTemplatePath, 'utf-8');
         const newCiContent = ciContent.replace(/{{SERVICE_NAME}}/g, serviceName);
         const targetCiPath = path.join(workflowsDir, `${serviceName}.yml`);
         fs.writeFileSync(targetCiPath, newCiContent);
         console.log(`Created CI workflow at ${targetCiPath}`);
         fs.unlinkSync(ciTemplatePath); // Remove from service dir
      }
    }

    console.log('Installing dependencies...');
    // Just run pnpm install in the new directory
    try {
    execSync('pnpm install', { cwd: targetDir, stdio: 'inherit' });
    } catch (e) {
    console.warn('Dependency installation failed. You may need to run pnpm install manually.');
    }

    console.log(`\nService ${serviceName} created successfully!`);
    console.log(`\nNext steps:`);
    console.log(`  cd services/${serviceName}`);
    console.log(`  cp .env.example .env`);
    console.log(`  npm run dev`);
} catch (error) {
    console.error("Failed to create service:", error);
    // Cleanup?
}
