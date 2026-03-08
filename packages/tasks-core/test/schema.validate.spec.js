"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const schema_validate_js_1 = __importDefault(require("../src/tasks/schema.validate.js"));
test('valid schema passes', async () => {
    const schema = {
        type: 'object',
        properties: { a: { type: 'number' } },
        required: ['a'],
    };
    const out = await schema_validate_js_1.default.execute({}, {
        payload: { schema, data: { a: 1 } },
    });
    expect(out.payload.valid).toBe(true);
});
