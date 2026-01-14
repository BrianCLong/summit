import {
  countBullets,
  deriveLabelsFromFields,
  parseSections,
  validateSections,
} from '../.github/scripts/issue-triage-strict.js';

describe('issue triage strict helpers', () => {
  test('parses sections and validates required fields', () => {
    const body = `### Priority\nP1\n\n### Area\nserver\n\n### Type\nbug\n\n### Reproducibility\nAlways\n\n### Acceptance criteria\n- [ ] First\n- [ ] Second`;
    const sections = parseSections(body);
    const missing = validateSections(sections);

    expect(missing).toHaveLength(0);
  });

  test('flags acceptance criteria with insufficient bullets', () => {
    const body = `### Priority\nP2\n\n### Area\nweb\n\n### Type\nfeature\n\n### Reproducibility\nN/A (feature request)\n\n### Acceptance criteria\n- [ ] Only one`;
    const sections = parseSections(body);
    const missing = validateSections(sections);

    expect(missing.map((field: { label: string }) => field.label)).toContain(
      'Acceptance criteria',
    );
  });

  test('derives labels from fields', () => {
    const body = `### Priority\nP0\n\n### Area\nsecurity\n\n### Type\nsecurity\n\n### Reproducibility\nAlways\n\n### Acceptance criteria\n- [ ] One\n- [ ] Two`;
    const sections = parseSections(body);
    const labels = deriveLabelsFromFields(sections);

    expect(labels).toEqual({
      priority: 'priority:P0',
      area: 'area:security',
      type: 'type:security',
    });
  });

  test('counts checklist bullets', () => {
    const bullets = '- [ ] One\n- [ ] Two\nNot a bullet';
    expect(countBullets(bullets)).toBe(2);
  });
});
