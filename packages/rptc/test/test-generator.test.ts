import {
  PromptTemplate,
  type PromptValidationResult,
  booleanSlot,
  createPromptTemplate,
  enumSlot,
  generateTestSuite,
  numberSlot,
  stringSlot,
  type SlotValues,
  type TestHarness
} from '../src/index.js';

function buildTemplate() {
  return createPromptTemplate({
    name: 'policy-brief',
    description: 'Generate policy briefs with strict slot validation.',
    template: 'Policy for {{audience}} on {{topic}} with {{count}} actions. Mode={{mode}} Include summary={{includeSummary}}',
    slots: {
      audience: stringSlot({ constraints: { minLength: 4, maxLength: 32 }, example: 'mission planners' }),
      topic: stringSlot({ constraints: { minLength: 6, pattern: /^[A-Za-z\s]+$/ }, example: 'Resilience drills' }),
      count: numberSlot({ constraints: { min: 2, max: 4 }, example: 2 }),
      mode: enumSlot(['strategic', 'tactical'] as const, { defaultValue: 'strategic' }),
      includeSummary: booleanSlot({ defaultValue: true })
    }
  });
}

describe('generated test suites', () => {
  const template = buildTemplate();
  const suite = generateTestSuite(template, {
    validExample: {
      audience: 'intel chiefs',
      topic: 'Resilience drills',
      count: 3,
      mode: 'strategic',
      includeSummary: true
    }
  });

  it('passes when template enforces constraints', () => {
    const results = suite.run();
    expect(results.passed).toBe(true);
  });

  it('catches seeded regressions', () => {
    const broken: PromptTemplate<typeof template.slots> = {
      ...template,
      validate(values) {
        const slots = Object.fromEntries(
          Object.keys(template.slots).map((slot) => [slot, { valid: true, value: (values as Record<string, unknown>)[slot] }])
        ) as PromptValidationResult<typeof template.slots>['slots'];
        return {
          valid: true,
          slots,
          errors: [],
          value: values as SlotValues<typeof template.slots>
        } satisfies PromptValidationResult<typeof template.slots>;
      },
      compile(values) {
        return {
          name: template.name,
          description: template.description,
          template: template.template,
          rendered: template.template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key: string) => {
            const resolved = (values as Record<string, unknown>)[key];
            return resolved === undefined || resolved === null ? '' : String(resolved);
          }),
          slots: template.slots,
          values: values as SlotValues<typeof template.slots>,
          metadata: template.metadata
        };
      },
      render(values) {
        return this.compile(values as SlotValues<typeof template.slots>).rendered;
      }
    };

    const results = suite.run(broken);
    expect(results.passed).toBe(false);
    expect(results.results.some((result) => !result.passed)).toBe(true);
  });

  it('registers tests against a harness', () => {
    const calls: string[] = [];
    const harness: TestHarness = {
      describe(name, fn) {
        calls.push(`describe:${name}`);
        fn();
      },
      it(name, fn) {
        calls.push(`it:${name}`);
        fn();
      },
      expect
    };

    suite.register(harness);
    expect(calls.some((entry) => entry.startsWith('describe:'))).toBe(true);
    expect(calls.some((entry) => entry.startsWith('it:'))).toBe(true);
  });
});
