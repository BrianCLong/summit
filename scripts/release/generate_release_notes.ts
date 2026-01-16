import fs from 'fs/promises';
import path from 'path';
import { execSync } from 'child_process';

async function main() {
  const args = process.argv.slice(2);
  const releaseTag = args[0] || 'HEAD';
  const prevTag = args[1] || ''; // Optional: specify previous tag

  console.log(`Generating release notes for ${releaseTag}...`);

  try {
    // 1. Get Template
    const templatePath = path.resolve('docs/releases/RELEASE_NOTES_TEMPLATE.md');
    let template = await fs.readFile(templatePath, 'utf-8');

    // 2. Get Git Info
    const commitHash = execSync(`git rev-parse --short ${releaseTag}`).toString().trim();
    const date = new Date().toISOString().split('T')[0];

    // 3. Get Changelog
    let changelog = '';
    let range = releaseTag;
    if (prevTag) {
        range = `${prevTag}..${releaseTag}`;
    } else {
        // Try to find previous tag automatically
        try {
            const lastTag = execSync('git describe --tags --abbrev=0 ' + releaseTag + '^ 2>/dev/null').toString().trim();
            if (lastTag) {
                range = `${lastTag}..${releaseTag}`;
            }
        } catch (e) {
            // No previous tag found, log all
            console.log("No previous tag found, generating log for all history.");
        }
    }

    try {
        changelog = execSync(`git log --pretty=format:"- %s (%h) - %an" --no-merges ${range}`).toString();
    } catch (e) {
        console.warn("Could not generate git log, using empty changelog.");
        changelog = "- No changes detected or error reading git log.";
    }

    // 4. Fill Template
    const output = template
      .replace('{{RELEASE_TAG}}', releaseTag)
      .replace('{{DATE}}', date)
      .replace('{{COMMIT_HASH}}', commitHash)
      .replace('{{OVERVIEW_TEXT}}', `Release ${releaseTag} of Summit Intelligence Platform.`)
      .replace('{{CHANGELOG_LIST}}', changelog);

    // 5. Output
    const outputPath = `artifacts/releases/${releaseTag}/release-notes.md`;
    // ensure dir exists
    await fs.mkdir(path.dirname(outputPath), { recursive: true });
    await fs.writeFile(outputPath, output);

    console.log(`Release notes generated at ${outputPath}`);
  } catch (error) {
    console.error('Error generating release notes:', error);
    process.exit(1);
  }
}

if (import.meta.url === `file://${process.argv[1]}`) {
  main();
}
