"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../src/index");
it('kills when cost exceeds budget', () => {
    expect((0, index_1.shouldKill)(101, 100)).toBe(true);
});
