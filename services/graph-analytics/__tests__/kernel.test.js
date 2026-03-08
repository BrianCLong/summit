"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
it('shortestPath returns a path', async () => {
    const p = await (0, index_1.shortestPath)();
    expect(Array.isArray(p)).toBe(true);
});
