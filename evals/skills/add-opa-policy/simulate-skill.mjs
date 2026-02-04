import fs from 'node:fs/promises';
import path from 'node:path';

const prompt = process.env.SKILL_PROMPT ?? '';
const outputDir = process.env.SKILL_OUTPUT_DIR ?? '.';

const normalized = prompt.toLowerCase();
const shouldBlock = ['do not', 'avoid', 'skip', 'no policy'].some((phrase) =>
  normalized.includes(phrase),
);
const shouldTrigger =
  !shouldBlock &&
  ['opa', 'policy', 'rego', 'authorization', 'rule'].some((phrase) =>
    normalized.includes(phrase),
  );

const result = {
  triggered: shouldTrigger,
  prompt,
  actions: shouldTrigger ? ['author-policy', 'add-tests'] : [],
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(outputDir, 'result.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);

if (shouldTrigger) {
  await fs.writeFile(
    path.join(outputDir, 'policy-summary.json'),
    `${JSON.stringify(
      {
        policy: 'access-control',
        test_cases: 3,
        decision_log: true,
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}
