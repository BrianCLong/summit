import fs from 'node:fs/promises';
import path from 'node:path';

const releaseEvidenceDir = path.resolve(process.cwd(), 'release-evidence');
const tagPattern = /^v\d+\.\d+\.\d+(?:-rc\.\d+)?$/;
const shaPattern = /^[a-f0-9]{7,40}$/;
const graceMinutesEnv = Number.parseInt(process.env.EVIDENCE_EXPIRES_GRACE_MINUTES ?? '5', 10);
const expiresGraceMs = Number.isFinite(graceMinutesEnv) && graceMinutesEnv > 0 ? graceMinutesEnv * 60_000 : 0;

async function appendStepSummary(content) {
  const summaryPath = process.env.GITHUB_STEP_SUMMARY;
  if (!summaryPath) return;
  await fs.appendFile(summaryPath, content, 'utf8');
}

async function findEvidenceFiles() {
  try {
    const entries = await fs.readdir(releaseEvidenceDir, { withFileTypes: true });
    return entries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.json'))
      .map((entry) => path.join(releaseEvidenceDir, entry.name));
  } catch (error) {
    if (error.code === 'ENOENT') {
      return [];
    }
    throw error;
  }
}

function validateDate(value, fieldName) {
  if (typeof value !== 'string') {
    return { valid: false, message: `${fieldName} must be an ISO-8601 string` };
  }
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return { valid: false, message: `${fieldName} must be a valid ISO-8601 date` };
  }
  return { valid: true, date: parsed };
}

function validateEvidence(filePath, data) {
  const errors = [];
  const warnings = [];
  const relativePath = path.relative(process.cwd(), filePath);
  const fileTag = path.basename(filePath, '.json');

  if (typeof data.schemaVersion !== 'string' || data.schemaVersion.trim() === '') {
    errors.push('schemaVersion is required and must be a string');
  }

  if (typeof data.tag !== 'string' || data.tag.trim() === '') {
    errors.push('tag is required and must be a string');
  } else {
    if (!tagPattern.test(data.tag)) {
      errors.push(`tag must match pattern ${tagPattern}`);
    }
    if (data.tag !== fileTag) {
      errors.push(`tag (${data.tag}) must match filename (${fileTag})`);
    }
  }

  if (typeof data.sha !== 'string' || data.sha.trim() === '') {
    errors.push('sha is required and must be a string');
  } else if (!shaPattern.test(data.sha)) {
    errors.push('sha must be a lowercase hex string (7-40 characters)');
  }

  if (data.decision !== 'GO') {
    errors.push('decision must be "GO"');
  }

  const generatedValidation = validateDate(data.generatedAt, 'generatedAt');
  if (!generatedValidation.valid) {
    errors.push(generatedValidation.message);
  }

  const expiresValidation = validateDate(data.expiresAt, 'expiresAt');
  if (!expiresValidation.valid) {
    errors.push(expiresValidation.message);
  } else {
    const now = Date.now();
    const graceAdjustedNow = now - expiresGraceMs;
    if (expiresValidation.date.getTime() <= graceAdjustedNow) {
      const graceNote = expiresGraceMs > 0 ? ` (allowed grace: ${graceMinutesEnv}m)` : '';
      errors.push(`expiresAt must be in the future${graceNote}`);
    }
  }

  if (!data.run || typeof data.run !== 'object' || typeof data.run.url !== 'string' || data.run.url.trim() === '') {
    warnings.push('run.url is missing; include a run link for traceability');
  }

  return { errors, warnings, relativePath };
}

async function main() {
  const files = await findEvidenceFiles();
  const summaryLines = ['## Release evidence validation', ''];

  if (files.length === 0) {
    const message = 'No release evidence files found; skipping validation.';
    console.log(message);
    summaryLines.push(message);
    await appendStepSummary(summaryLines.join('\n'));
    return;
  }

  let hasErrors = false;
  const now = new Date().toISOString();
  summaryLines.push(`Run at: ${now}`);
  summaryLines.push('');

  for (const file of files) {
    const relativePath = path.relative(process.cwd(), file);
    try {
      const raw = await fs.readFile(file, 'utf8');
      const parsed = JSON.parse(raw);
      const { errors, warnings } = validateEvidence(file, parsed);

      if (errors.length === 0) {
        const status = warnings.length ? '✅ PASSED with warnings' : '✅ PASSED';
        console.log(`${status}: ${relativePath}`);
      } else {
        hasErrors = true;
        console.error(`❌ FAILED: ${relativePath}`);
      }

      if (errors.length > 0) {
        errors.forEach((error) => console.error(`  - ${error}`));
      }

      if (warnings.length > 0) {
        warnings.forEach((warning) => console.warn(`  ! ${warning}`));
      }

      summaryLines.push(`- **${relativePath}**`);
      if (errors.length === 0) {
        summaryLines.push(`  - Status: PASS${warnings.length ? ' (warnings present)' : ''}`);
      } else {
        summaryLines.push('  - Status: FAIL');
      }
      if (errors.length > 0) {
        summaryLines.push('  - Errors:');
        errors.forEach((error) => summaryLines.push(`    - ${error}`));
      }
      if (warnings.length > 0) {
        summaryLines.push('  - Warnings:');
        warnings.forEach((warning) => summaryLines.push(`    - ${warning}`));
      }
      summaryLines.push('');
    } catch (error) {
      hasErrors = true;
      console.error(`❌ FAILED: ${relativePath}`);
      console.error(`  - ${error.message}`);
      summaryLines.push(`- **${relativePath}**`);
      summaryLines.push('  - Status: FAIL');
      summaryLines.push(`  - Errors:`);
      summaryLines.push(`    - ${error.message}`);
      summaryLines.push('');
    }
  }

  summaryLines.push(hasErrors ? '**Overall status:** FAIL' : '**Overall status:** PASS');
  await appendStepSummary(summaryLines.join('\n'));

  if (hasErrors) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error('Unexpected error during validation:', error);
  process.exit(1);
});
