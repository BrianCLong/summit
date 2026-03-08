import fs from 'node:fs/promises';
import path from 'node:path';

async function verifyMaestroSpec(bundlePath) {
  const content = await fs.readFile(bundlePath, 'utf8');
  const bundle = JSON.parse(content);

  const errors = [];

  // 1. Check for IDs in requirements
  bundle.spec.functional_requirements.forEach(req => {
    if (!req.id) {
      errors.push(`Requirement missing ID: ${req.description}`);
    }
  });

  // 2. Check for open questions
  if (bundle.spec.open_questions && bundle.spec.open_questions.length > 0) {
    errors.push(`Spec has ${bundle.spec.open_questions.length} open questions.`);
  }

  // 3. Check completeness score
  if (bundle.metrics.completeness_score < 20) {
    errors.push(`Spec score too low: ${bundle.metrics.completeness_score}/25 (required 20)`);
  }

  if (errors.length > 0) {
    console.error("Maestro GA Gate FAILED:");
    errors.forEach(err => console.error(`- ${err}`));
    process.exit(1);
  }

  console.log("Maestro GA Gate PASSED.");
}

const bundlePath = process.argv[2];
if (!bundlePath) {
  console.error("Usage: node verify-maestro-spec.mjs <bundle_path>");
  process.exit(1);
}

verifyMaestroSpec(bundlePath).catch(err => {
  console.error(err);
  process.exit(1);
});
