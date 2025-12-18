import { describe, expect, it } from 'vitest';
import { estimate } from '../src/estimator.js';
import { sandboxRun } from '../src/executor.js';
import { diffQueries } from '../src/diff.js';
import { translate } from '../src/translator.js';
import { validateCypher } from '../src/validator.js';

const GOLDEN_PROMPTS = [
  'List all Person nodes',
  'Find person by name',
  'Show person age',
  'People living in a city',
  'Person title search',
  'All companies by industry',
  'Companies in a location',
  'Company name lookup',
  'Projects with status',
  'Projects by budget',
  'Events hosted at company',
  'Events by location',
  'Event date filter',
  'People working at a company',
  'People participating in project',
  'Companies funding projects',
  'Show person city',
  'Find project status done',
  'List project budget big',
  'Find event name',
  'Locate events in city',
  'Company industry filter',
  'Project name search',
  'Event hosted at acme',
  'Who works at acme company',
  'People with title analyst',
  'People older',
  'Project status active',
  'Event date upcoming',
  'Company location nyc',
  'Find company by name',
  'Show projects funded',
  'Participants for project',
  'Show companies funding project',
  'List events hosted by company',
  'Find persons in project',
  'Show city for persons',
  'List all companies',
  'List all events',
  'List all projects',
  'Find person id 10',
  'Project budget filter',
  'Company industry fintech',
  'Event location san francisco',
  'People with title manager',
  'Project status planned',
  'Person age 30',
  'Company location remote',
  'Event hosted at hq',
  'Find company industry health'
];

describe('nl-cypher translation', () => {
  it('generates syntactically valid cypher for golden prompts', () => {
    const failures: string[] = [];

    GOLDEN_PROMPTS.forEach((prompt) => {
      const result = translate(prompt);
      const { valid } = validateCypher(result.cypher);
      if (!valid) {
        failures.push(prompt);
      }
      expect(result.cypher).toMatch(/MATCH \(n:/);
      expect(result.cypher).toMatch(/RETURN n/);
    });

    expect(failures.length).toBeLessThanOrEqual(GOLDEN_PROMPTS.length * 0.05);
  });

  it('provides an accompanying SQL fallback', () => {
    const result = translate('List all projects');
    expect(result.sqlFallback).toBeDefined();
    expect(result.sqlFallback).toMatch(/select/i);
  });

  it('estimates cost based on translation', () => {
    const estimateResult = estimate('Projects by status');
    expect(estimateResult.estimatedRows).toBeGreaterThan(0);
    expect(estimateResult.estimatedCost).toBeGreaterThan(0);
  });

  it('executes sandbox run with row caps', () => {
    const result = sandboxRun('List people with name filter');
    expect(result.previewRows.length).toBeLessThanOrEqual(20);
    expect(typeof result.truncated).toBe('boolean');
  });

  it('can diff sanitized queries', () => {
    const translation = translate('List all people');
    const diff = diffQueries(translation.cypher, translation.cypher);
    expect(diff.every((line) => line.type === 'unchanged')).toBe(true);
  });
});
