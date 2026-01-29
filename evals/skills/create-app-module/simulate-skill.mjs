import fs from 'node:fs/promises';
import path from 'node:path';

const prompt = process.env.SKILL_PROMPT ?? '';
const outputDir = process.env.SKILL_OUTPUT_DIR ?? '.';

const normalized = prompt.toLowerCase();
const shouldBlock = ['do not', 'avoid', 'no need', 'skip'].some((phrase) =>
  normalized.includes(phrase),
);
const shouldTrigger =
  !shouldBlock &&
  ['create', 'scaffold', 'new app', 'module', 'package'].some((phrase) =>
    normalized.includes(phrase),
  );

const result = {
  triggered: shouldTrigger,
  prompt,
  actions: shouldTrigger ? ['scaffold-app'] : [],
};

await fs.mkdir(outputDir, { recursive: true });
await fs.writeFile(
  path.join(outputDir, 'result.json'),
  `${JSON.stringify(result, null, 2)}\n`,
  'utf8',
);

if (shouldTrigger) {
  await fs.writeFile(
    path.join(outputDir, 'scaffold-summary.json'),
    `${JSON.stringify(
      {
        name: 'example-app',
        language: 'typescript',
        framework: 'vite',
      },
      null,
      2,
    )}\n`,
    'utf8',
  );
}
