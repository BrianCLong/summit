"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const models_js_1 = require("../src/conductor/models.js");
test('knn returns neighbors (empty without data)', async () => {
    const r = await (0, models_js_1.knn)('acme', 'entity-1', 5);
    expect(Array.isArray(r)).toBe(true);
});
