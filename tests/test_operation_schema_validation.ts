import test from 'node:test';
import assert from 'node:assert';
import fs from 'node:fs';
import path from 'node:path';

// Since this is a minimal winning slice validation, we'll write a manual schema validator
// as we don't know the exact JSON schema package installed in the monorepo root
// but the requirement is just to assert the shape described by the JSON schemas.

const diffOperationSchema = JSON.parse(fs.readFileSync(path.resolve('./summit/schemas/diff-operation.schema.json'), 'utf-8'));
const operationPlanSchema = JSON.parse(fs.readFileSync(path.resolve('./summit/schemas/operation-plan.schema.json'), 'utf-8'));

function validatePlan(plan: any): boolean {
    if (!plan) return false;
    if (!operationPlanSchema.required.every((key: string) => key in plan)) return false;

    if (!operationPlanSchema.properties.mode.enum.includes(plan.mode)) return false;
    if (typeof plan.scope !== 'object' || plan.scope === null || Array.isArray(plan.scope)) return false;
    if (!Array.isArray(plan.operations)) return false;

    for (const op of plan.operations) {
         if (!op) return false;
         if (!diffOperationSchema.required.every((key: string) => key in op)) return false;
         if (!diffOperationSchema.properties.kind.enum.includes(op.kind)) return false;
    }

    return true;
}

test('Schema Validation: Accepts valid operation plan', () => {
    const validPlan = {
        mode: "agent",
        scope: { target: "page" },
        operations: [
            {
                kind: "add",
                target: "section_2",
                delta: { content: "New data" }
            }
        ]
    };

    assert.strictEqual(validatePlan(validPlan), true);
});

test('Schema Validation: Rejects invalid mode', () => {
    const invalidModePlan = {
        mode: "unsupported_mode",
        scope: {},
        operations: []
    };

    assert.strictEqual(validatePlan(invalidModePlan), false);
});

test('Schema Validation: Rejects missing scope', () => {
    const noScopePlan = {
        mode: "edit",
        operations: []
    };

    assert.strictEqual(validatePlan(noScopePlan), false);
});

test('Schema Validation: Rejects invalid operation kind', () => {
    const invalidOpKindPlan = {
        mode: "ask",
        scope: {},
        operations: [
            {
                kind: "destroy",
                target: "db"
            }
        ]
    };

    assert.strictEqual(validatePlan(invalidOpKindPlan), false);
});
