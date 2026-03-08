"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_js_1 = require("../src/index.js");
function buildTemplate() {
    return (0, index_js_1.createPromptTemplate)({
        name: 'policy-brief',
        description: 'Generate policy briefs with strict slot validation.',
        template: 'Policy for {{audience}} on {{topic}} with {{count}} actions. Mode={{mode}} Include summary={{includeSummary}}',
        slots: {
            audience: (0, index_js_1.stringSlot)({
                constraints: { minLength: 4, maxLength: 32 },
                example: 'mission planners',
            }),
            topic: (0, index_js_1.stringSlot)({
                constraints: { minLength: 6, pattern: /^[A-Za-z\s]+$/ },
                example: 'Resilience drills',
            }),
            count: (0, index_js_1.numberSlot)({ constraints: { min: 2, max: 4 }, example: 2 }),
            mode: (0, index_js_1.enumSlot)(['strategic', 'tactical'], {
                defaultValue: 'strategic',
            }),
            includeSummary: (0, index_js_1.booleanSlot)({ defaultValue: true }),
        },
    });
}
describe('generated test suites', () => {
    const template = buildTemplate();
    const suite = (0, index_js_1.generateTestSuite)(template, {
        validExample: {
            audience: 'intel chiefs',
            topic: 'Resilience drills',
            count: 3,
            mode: 'strategic',
            includeSummary: true,
        },
    });
    it('passes when template enforces constraints', () => {
        const results = suite.run();
        expect(results.passed).toBe(true);
    });
    it('catches seeded regressions', () => {
        const broken = {
            ...template,
            validate(values) {
                const slots = Object.fromEntries(Object.keys(template.slots).map((slot) => [
                    slot,
                    { valid: true, value: values[slot] },
                ]));
                return {
                    valid: true,
                    slots,
                    errors: [],
                    value: values,
                };
            },
            compile(values) {
                return {
                    name: template.name,
                    description: template.description,
                    template: template.template,
                    rendered: template.template.replace(/{{\s*([a-zA-Z0-9_]+)\s*}}/g, (_, key) => {
                        const resolved = values[key];
                        return resolved === undefined || resolved === null
                            ? ''
                            : String(resolved);
                    }),
                    slots: template.slots,
                    values: values,
                    metadata: template.metadata,
                };
            },
            render(values) {
                return this.compile(values)
                    .rendered;
            },
        };
        const results = suite.run(broken);
        expect(results.passed).toBe(false);
        expect(results.results.some((result) => !result.passed)).toBe(true);
    });
    it('registers tests against a harness', () => {
        const calls = [];
        const harness = {
            describe(name, fn) {
                calls.push(`describe:${name}`);
                fn();
            },
            it(name, fn) {
                calls.push(`it:${name}`);
                fn();
            },
            expect,
        };
        suite.register(harness);
        expect(calls.some((entry) => entry.startsWith('describe:'))).toBe(true);
        expect(calls.some((entry) => entry.startsWith('it:'))).toBe(true);
    });
});
