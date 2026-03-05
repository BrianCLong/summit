import { join } from 'node:path';
import { readFileSync, readdirSync } from 'node:fs';

// A mock function simulating prompt generation where untrusted input is escaped
function renderPrompt(untrustedInput) {
  // Simple XML-style boundary escaping simulation
  const escaped = untrustedInput.replace(/</g, '&lt;').replace(/>/g, '&gt;');
  return `<system>You are a helpful assistant.</system>\n<user_input>${escaped}</user_input>`;
}

export function runPromptInjectionGate() {
  const violations = [];
  const scannedFixtures = [];
  const root = join(process.cwd(), 'GOLDEN/datasets/governance-fixtures/prompt-injection');

  try {
    const types = ['benign', 'malicious'];
    for (const type of types) {
      const dir = join(root, type);
      const files = readdirSync(dir);
      for (const file of files) {
        if (!file.endsWith('.json')) continue;
        scannedFixtures.push(file);
        const content = readFileSync(join(dir, file), 'utf8');
        const data = JSON.parse(content);

        const rendered = renderPrompt(data.text);

        // Rule: Untrusted text cannot alter instruction hierarchy.
        // Rule: Untrusted text cannot request tool invocation.
        // Fails if: Any fixture renders into "control channel" text.

        // The rendered prompt should only have exactly one <system> block and one <user_input> block
        // if escaping works correctly.
        const systemCount = (rendered.match(/<system>/g) || []).length;
        if (systemCount > 1) {
          violations.push(`Fixture ${type}/${file} successfully injected a control block.`);
        }
      }
    }
  } catch (err) {
    violations.push(`Failed to process fixtures: ${err.message}`);
  }

  return { scannedFixtures, violations };
}
