import fs from 'node:fs/promises';
import path from 'node:path';

const prompt = process.env.SKILL_PROMPT ?? '';
const outputDir = process.env.SKILL_OUTPUT_DIR ?? '.';

const normalized = prompt.toLowerCase();
const shouldBlock = ['do not', 'avoid', 'skip', 'no fix'].some((phrase) =>
  normalized.includes(phrase),
);
const shouldTrigger =
  !shouldBlock &&
  ['ci', 'failing test', 'flaky', 'pipeline', 'lint'].some((phrase) =>
    normalized.includes(phrase),
  );

const result = {
  triggered: shouldTrigger,
  prompt,
  actions: shouldTrigger ? ['diagnose', 'apply-fix', 'verify'] : [],
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(outputDir, 'result.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);

if (shouldTrigger) {
  await fs.writeFile(
    path.join(outputDir, 'ci-fix-summary.json'),
    `${JSON.stringify(
      {
        root_cause: 'timeout',
        fix: 'increase-test-timeout',
        tests_run: ['pnpm test:unit'],
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}
