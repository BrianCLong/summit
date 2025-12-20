// @ts-nocheck
import { describe, expect, it, beforeEach, afterEach } from 'vitest';
import {
  enforceCitationGateForAnswer,
  isCitationGateEnabled,
  validateCitationsAgainstContext,
} from '../citation-gate.js';

describe('citation-gate', () => {
  const evidenceSnippets = [
    { evidenceId: 'ev-1', claimId: 'c-1' },
    { evidenceId: 'ev-2' },
  ];

  beforeEach(() => {
    process.env.CITATION_GATE = undefined;
  });

  afterEach(() => {
    process.env.CITATION_GATE = undefined;
  });

  it('detects missing citations without blocking when gate disabled', () => {
    const result = validateCitationsAgainstContext({
      answerText: 'A substantive answer that lacks citations entirely.',
      citations: [],
      evidenceSnippets,
    });

    expect(isCitationGateEnabled()).toBe(false);
    expect(result.blocked).toBe(false);
    expect(result.diagnostics?.missingCitations?.message).toContain(
      'CITATION_GATE requires',
    );
  });

  it('blocks missing citations when gate enabled', () => {
    process.env.CITATION_GATE = '1';

    const result = validateCitationsAgainstContext({
      answerText:
        'This is an intentionally long substantive answer exceeding the threshold with no citations included anywhere in the text.',
      citations: [],
      evidenceSnippets,
    });

    expect(result.blocked).toBe(true);
    expect(result.diagnostics?.missingCitations).toBeDefined();
  });

  it('flags dangling citations', () => {
    process.env.CITATION_GATE = '1';

    const result = validateCitationsAgainstContext({
      answerText:
        'Another lengthy answer that references unknown citation identifiers.',
      citations: [{ evidenceId: 'ev-missing' }],
      evidenceSnippets,
    });

    expect(result.diagnostics?.danglingCitations?.evidenceIds).toContain(
      'ev-missing',
    );
  });

  it('returns fallback answer when blocking missing citations', () => {
    process.env.CITATION_GATE = '1';

    const { answer, diagnostics } = enforceCitationGateForAnswer({
      llmAnswer: {
        answerText:
          'This is a substantive answer text that contains no citations and should be blocked when the gate is enabled.',
        citations: [],
        unknowns: [],
      },
      evidenceSnippets,
    });

    expect(answer.citations.length).toBe(0);
    expect(answer.answerText).toContain('citation-backed answer');
    expect(diagnostics?.missingCitations).toBeDefined();
  });
});
