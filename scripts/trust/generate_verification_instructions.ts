import fs from 'fs/promises';
import path from 'path';

async function main() {
  const args = process.argv.slice(2);
  const releaseTag = args[0] || 'v0.0.0';
  const outputDir = args[1] || `artifacts/releases/${releaseTag}`;
  const publicKeyUrl = args[2] || 'https://trust.summit.com/keys/cosign.pub';

  console.log(`Generating verification instructions for ${releaseTag}...`);

  const content = `# Verification Instructions for Release ${releaseTag}

## Prerequisites
*   [Cosign](https://github.com/sigstore/cosign) installed.
*   The Summit Public Key: [Download](${publicKeyUrl})

## Verify Artifacts

### 1. Verify Checksums
Verify that the \`checksums.txt\` file is authentic and has not been tampered with.

\`\`\`bash
cosign verify-blob \\
  --key cosign.pub \\
  --signature checksums.txt.sig \\
  checksums.txt
\`\`\`

If successful, verify the artifacts against the checksums:

\`\`\`bash
sha256sum -c checksums.txt
\`\`\`

### 2. Verify SBOMs (Optional)
You can also verify individual SBOM files directly.

\`\`\`bash
cosign verify-blob \\
  --key cosign.pub \\
  --signature sbom/server-sbom.json.sig \\
  sbom/server-sbom.json
\`\`\`

## Trusted Builder
This release was built on GitHub Actions.
Builder ID: \`https://github.com/BrianCLong/summit/.github/workflows/release.yml@refs/tags/${releaseTag}\`

`;

  try {
    await fs.mkdir(outputDir, { recursive: true });
    await fs.writeFile(path.join(outputDir, 'verification_instructions.md'), content);
    console.log(`Instructions generated at ${path.join(outputDir, 'verification_instructions.md')}`);
  } catch (error) {
    console.error('Error generating instructions:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
