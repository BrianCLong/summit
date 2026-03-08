"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTestSuite = generateTestSuite;
function generateTestSuite(template, options = {}) {
    const baseValues = buildBaseValues(template, options);
    const cases = [
        {
            description: 'renders successfully with canonical valid values',
            slot: 'template',
            values: baseValues,
            expectValid: true,
        },
    ];
    for (const [slotName, schema] of Object.entries(template.slots)) {
        const slotCases = buildSlotCases(slotName, schema, options);
        cases.push(...slotCases);
    }
    const suiteName = options.suiteName ?? `${template.name} validation suite`;
    return {
        name: suiteName,
        baseValues,
        cases,
        run(targetTemplate) {
            const target = targetTemplate ?? template;
            const results = cases.map((testCase) => executeTestCase(target, baseValues, testCase));
            return {
                passed: results.every((result) => result.passed),
                results,
            };
        },
        register(harness) {
            const effectiveHarness = harness ?? detectHarness();
            if (!effectiveHarness) {
                throw new Error('No test harness detected. Provide a harness with describe/it/expect.');
            }
            effectiveHarness.describe(suiteName, () => {
                for (const testCase of cases) {
                    effectiveHarness.it(testCase.description, () => {
                        const result = executeTestCase(template, baseValues, testCase);
                        if (testCase.expectValid) {
                            effectiveHarness.expect(result.passed).toBe(true);
                        }
                        else {
                            effectiveHarness.expect(result.passed).toBe(true);
                        }
                        if (!result.passed && result.error) {
                            throw result.error;
                        }
                    });
                }
            });
        },
    };
}
function buildBaseValues(template, options) {
    const base = {
        ...(options.validExample ?? {}),
    };
    for (const [slotName, schema] of Object.entries(template.slots)) {
        if (base[slotName] !== undefined) {
            continue;
        }
        const value = deriveValidValue(slotName, schema);
        if (value === undefined) {
            throw new Error(`Unable to derive valid example for slot ${String(slotName)}. Provide a validExample override.`);
        }
        base[slotName] = value;
    }
    return base;
}
function deriveValidValue(slotName, schema) {
    if ('example' in schema && schema.example !== undefined) {
        return schema.example;
    }
    if ('defaultValue' in schema && schema.defaultValue !== undefined) {
        return schema.defaultValue;
    }
    switch (schema.kind) {
        case 'string':
            return deriveStringValue(slotName, schema);
        case 'number':
            return deriveNumberValue(schema);
        case 'boolean':
            return true;
        case 'enum':
            return schema.values[0];
        default:
            return undefined;
    }
}
function deriveStringValue(slotName, schema) {
    const min = schema.constraints?.minLength ?? 1;
    const base = schema.constraints?.pattern?.source.includes('email')
        ? 'user@example.com'
        : `${slotName}-value`;
    let candidate = base.repeat(Math.max(1, Math.ceil(min / base.length)));
    if (candidate.length < min) {
        candidate = candidate.padEnd(min, 'x');
    }
    if (schema.constraints?.maxLength &&
        candidate.length > schema.constraints.maxLength) {
        candidate = candidate.slice(0, schema.constraints.maxLength);
    }
    if (schema.constraints?.pattern &&
        !schema.constraints.pattern.test(candidate)) {
        candidate = ensurePatternCompliance(schema.constraints.pattern, min, schema.constraints?.maxLength);
    }
    return candidate;
}
function ensurePatternCompliance(pattern, minLength, maxLength) {
    const safe = 'valid';
    let candidate = safe;
    if (minLength && candidate.length < minLength) {
        candidate = candidate.padEnd(minLength, 'd');
    }
    if (maxLength && candidate.length > maxLength) {
        candidate = candidate.slice(0, maxLength);
    }
    if (pattern.test(candidate)) {
        return candidate;
    }
    return pattern.flags.includes('i')
        ? candidate.toUpperCase()
        : `${candidate}x`;
}
function deriveNumberValue(schema) {
    if (schema.constraints?.min !== undefined) {
        return schema.constraints.min;
    }
    if (schema.constraints?.max !== undefined) {
        return schema.constraints.max;
    }
    return 1;
}
function buildSlotCases(slotName, schema, options) {
    const cases = [];
    if (!schema.optional && schema.defaultValue === undefined) {
        cases.push({
            description: `fails when slot ${String(slotName)} is missing`,
            slot: slotName,
            values: { [slotName]: undefined },
            expectValid: false,
        });
    }
    const counterExamples = collectCounterExamples(slotName, schema, options);
    for (const value of counterExamples) {
        cases.push({
            description: `rejects counterexample for slot ${String(slotName)}`,
            slot: slotName,
            values: { [slotName]: value },
            expectValid: false,
        });
    }
    switch (schema.kind) {
        case 'string':
            cases.push(...buildStringCases(slotName, schema));
            break;
        case 'number':
            cases.push(...buildNumberCases(slotName, schema));
            break;
        case 'enum':
            cases.push(buildEnumCase(slotName, schema));
            break;
        case 'boolean':
            cases.push(buildBooleanCase(slotName));
            break;
    }
    return cases;
}
function buildStringCases(slotName, schema) {
    const cases = [];
    const min = schema.constraints?.minLength;
    const max = schema.constraints?.maxLength;
    if (min !== undefined && min > 0) {
        cases.push({
            description: `enforces minLength on ${String(slotName)}`,
            slot: slotName,
            values: {
                [slotName]: 'x'.repeat(Math.max(0, min - 1)),
            },
            expectValid: false,
        });
    }
    if (max !== undefined) {
        cases.push({
            description: `enforces maxLength on ${String(slotName)}`,
            slot: slotName,
            values: { [slotName]: 'y'.repeat(max + 1) },
            expectValid: false,
        });
    }
    if (schema.constraints?.pattern) {
        cases.push({
            description: `enforces pattern on ${String(slotName)}`,
            slot: slotName,
            values: { [slotName]: '__invalid__' },
            expectValid: false,
        });
    }
    return cases;
}
function buildNumberCases(slotName, schema) {
    const cases = [];
    const min = schema.constraints?.min;
    const max = schema.constraints?.max;
    if (min !== undefined) {
        cases.push({
            description: `enforces minimum on ${String(slotName)}`,
            slot: slotName,
            values: { [slotName]: min - 1 },
            expectValid: false,
        });
    }
    if (max !== undefined) {
        cases.push({
            description: `enforces maximum on ${String(slotName)}`,
            slot: slotName,
            values: { [slotName]: max + 1 },
            expectValid: false,
        });
    }
    return cases;
}
function buildEnumCase(slotName, _schema) {
    void _schema;
    return {
        description: `rejects value outside enum for ${String(slotName)}`,
        slot: slotName,
        values: { [slotName]: '__invalid__' },
        expectValid: false,
    };
}
function buildBooleanCase(slotName) {
    return {
        description: `rejects non-boolean values for ${String(slotName)}`,
        slot: slotName,
        values: { [slotName]: 'truthy' },
        expectValid: false,
    };
}
function collectCounterExamples(slotName, schema, options) {
    const schemaExamples = schema.counterExamples ?? [];
    const optionExamples = (options.counterExamples?.[slotName] ??
        []);
    return [...schemaExamples, ...optionExamples];
}
function executeTestCase(template, baseValues, testCase) {
    const mergedValues = {
        ...baseValues,
        ...testCase.values,
    };
    try {
        const result = template.validate(mergedValues);
        if (testCase.expectValid && !result.valid) {
            return {
                testCase,
                passed: false,
                error: new Error(`Expected valid but got errors for slot ${String(testCase.slot)}.`),
            };
        }
        if (!testCase.expectValid && result.valid) {
            return {
                testCase,
                passed: false,
                error: new Error(`Expected validation failure for slot ${String(testCase.slot)}.`),
            };
        }
        if (testCase.expectValid) {
            template.render(mergedValues);
            return { testCase, passed: true };
        }
        let threw = false;
        try {
            template.render(mergedValues);
        }
        catch {
            threw = true;
        }
        if (!threw) {
            return {
                testCase,
                passed: false,
                error: new Error(`Expected render to throw for invalid slot ${String(testCase.slot)}.`),
            };
        }
        return { testCase, passed: true };
    }
    catch (error) {
        return { testCase, passed: false, error: error };
    }
}
function detectHarness() {
    const globalRef = globalThis;
    if (typeof globalRef.describe === 'function' &&
        typeof globalRef.it === 'function' &&
        typeof globalRef.expect === 'function') {
        return {
            describe: globalRef.describe.bind(globalRef),
            it: globalRef.it.bind(globalRef),
            expect: globalRef.expect,
        };
    }
    return undefined;
}
