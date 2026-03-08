"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const translate_1 = require("../src/nl/translate");
const lint_1 = require("../src/lint");
test('nl→flow adds gate when confidence≥85', () => {
    const f = (0, translate_1.nlToFlow)('On PR: build then test (TIA). Deploy if confidence≥85.');
    const ids = f.nodes.map((n) => n.id);
    expect(ids).toContain('gate');
    expect((0, lint_1.flowLint)(f).find((x) => x.level === 'error')).toBeFalsy();
});
