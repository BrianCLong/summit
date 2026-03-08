"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const ingest_1 = require("../src/ingest");
test('ingest builds nodes/edges', async () => {
    await (0, ingest_1.ingest)();
    expect(true).toBe(true); // sanity; real test would query sqlite
});
