"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cas_key_1 = require("./cas_key");
test('key changes when file content changes', () => {
    const a = (0, cas_key_1.casKey)({
        files: ['server/src/app.ts'],
        node: '18',
        pnpm: '9',
        jest: '29',
        env: {},
    });
    // simulate change with different env
    const b = (0, cas_key_1.casKey)({
        files: ['server/src/app.ts'],
        node: '18',
        pnpm: '9',
        jest: '29',
        env: { FOO: '1' },
    });
    expect(a).not.toEqual(b);
});
