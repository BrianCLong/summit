import * as fs from 'fs';

const BANNED_PATTERNS = [
  /AWS_ACCESS_KEY_ID/,
  /AWS_SECRET_ACCESS_KEY/,
  /--INTERNAL-ONLY--/,
  /CONFIDENTIAL - DO NOT DISTRIBUTE/
];

const INTERNAL_BLOCK_START = /<!--\s*INTERNAL-START\s*-->/;
const INTERNAL_BLOCK_END = /<!--\s*INTERNAL-END\s*-->/;

export function redactContent(content: string): string {
  const lines = content.split('\n');
  const output: string[] = [];
  let inInternalBlock = false;

  for (const line of lines) {
    if (INTERNAL_BLOCK_START.test(line)) {
      inInternalBlock = true;
      continue;
    }
    if (INTERNAL_BLOCK_END.test(line)) {
      inInternalBlock = false;
      continue;
    }

    if (!inInternalBlock) {
      output.push(line);
    }
  }

  return output.join('\n');
}

export function checkSafety(content: string): string[] {
  const errors: string[] = [];
  BANNED_PATTERNS.forEach(pattern => {
    if (pattern.test(content)) {
      errors.push(`Found banned pattern: ${pattern}`);
    }
  });
  return errors;
}

export function redactFile(inputPath: string, outputPath: string): void {
  const content = fs.readFileSync(inputPath, 'utf8');
  const redacted = redactContent(content);

  const errors = checkSafety(redacted);
  if (errors.length > 0) {
    throw new Error(`Safety check failed for ${inputPath}:\n${errors.join('\n')}`);
  }

  fs.writeFileSync(outputPath, redacted);
}
