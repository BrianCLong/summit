import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';
import crypto from 'crypto';

// Helper to calculate SHA256 checksum
async function calculateChecksum(filePath: string): Promise<string> {
  const fileBuffer = await fs.readFile(filePath);
  const hashSum = crypto.createHash('sha256');
  hashSum.update(fileBuffer);
  return hashSum.digest('hex');
}

async function signFile(filePath: string, keyPath?: string, isDevMode: boolean = false) {
    // This function assumes cosign is available in the path.
    // If keyPath is not provided, it might assume environment variables or OIDC (keyless).

    try {
        execSync('cosign version', { stdio: 'ignore' });
        // Cosign exists
        console.log(`Signing ${filePath} with cosign...`);
        const cmd = keyPath
            ? `cosign sign-blob --key ${keyPath} --output-signature ${filePath}.sig ${filePath} --yes`
            : `cosign sign-blob --output-signature ${filePath}.sig ${filePath} --yes`; // Keyless/OIDC

        execSync(cmd, { stdio: 'inherit' });
    } catch (e) {
        if (isDevMode) {
             console.warn(`WARNING: 'cosign' not found or failed. Mocking signature for ${filePath} (DEV MODE).`);
             await fs.writeFile(`${filePath}.sig`, `MOCK_SIGNATURE_FOR_${path.basename(filePath)}`);
        } else {
             console.error(`ERROR: 'cosign' not found or failed. Signing is required in production mode. Use --dev to mock.`);
             throw e;
        }
    }
}

async function main() {
  const args = process.argv.slice(2);

  // Parse arguments properly
  let artifactsDir = '';
  let keyPath = '';
  let isDevMode = false;

  for (let i = 0; i < args.length; i++) {
      if (args[i] === '--dev') {
          isDevMode = true;
      } else if (!artifactsDir) {
          artifactsDir = args[i];
      } else if (!keyPath) {
          keyPath = args[i];
      }
  }

  if (!artifactsDir) {
    console.error('Usage: tsx sign_release_artifacts.ts <artifacts_dir> [private_key_path] [--dev]');
    process.exit(1);
  }

  console.log(`Signing artifacts in ${artifactsDir}... (Dev Mode: ${isDevMode})`);

  try {
    const files = await fs.readdir(artifactsDir);
    const checksumsLines: string[] = [];

    for (const file of files) {
        const filePath = path.join(artifactsDir, file);
        const stat = await fs.stat(filePath);

        if (stat.isFile() && !file.endsWith('.sig') && !file.endsWith('checksums.txt')) {
            // Calculate Checksum
            const hash = await calculateChecksum(filePath);
            checksumsLines.push(`${hash}  ${file}`);

            // Sign the file
            await signFile(filePath, keyPath, isDevMode);
        }
    }

    // Write Checksums
    const checksumsPath = path.join(artifactsDir, 'checksums.txt');
    await fs.writeFile(checksumsPath, checksumsLines.join('\n'));
    console.log(`Generated checksums.txt`);

    // Sign Checksums file itself
    await signFile(checksumsPath, keyPath, isDevMode);

    console.log('Artifacts signed successfully.');
  } catch (error) {
    console.error('Error signing artifacts:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
