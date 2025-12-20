import type { PromptTemplate, PromptValidationResult } from '../compiler.js';
import type { SlotSchemaMap } from '../schema.js';
import type { GeneratedTestResults } from '../testing/types.js';

export function formatValidationResultForCI<TSlots extends SlotSchemaMap>(
  template: PromptTemplate<TSlots>,
  result: PromptValidationResult<TSlots>,
): string {
  const header = `[RPTC] Validation ${result.valid ? 'PASSED' : 'FAILED'} :: template=${template.name}`;
  if (result.valid) {
    return `${header} :: slots=${Object.keys(template.slots).length}`;
  }
  const lines = result.errors
    .map((error) => {
      const details = error.details
        .map((detail) => `${detail.code} (${detail.message})`)
        .join(', ');
      return `  - slot=${String(error.slot)} :: ${details}`;
    })
    .join('\n');
  return `${header}\n${lines}`;
}

export function formatTestRunForCI<TSlots extends SlotSchemaMap>(
  suiteName: string,
  results: GeneratedTestResults<TSlots>,
): string {
  const status = results.passed ? 'PASSED' : 'FAILED';
  const lines = results.results
    .filter((result) => !result.passed)
    .map((result) => {
      const message = result.error?.message ?? 'Unknown failure';
      return `  - case="${result.testCase.description}" slot=${String(result.testCase.slot)} :: ${message}`;
    })
    .join('\n');
  return lines.length > 0
    ? `[RPTC] TestSuite ${status} :: ${suiteName}\n${lines}`
    : `[RPTC] TestSuite ${status} :: ${suiteName}`;
}
