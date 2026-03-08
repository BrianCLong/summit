"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const cluster_1 = require("../src/cluster");
test('clusters similar messages', () => {
    const A = (0, cluster_1.cluster)(['TypeError: x', 'TypeError: y', 'Timeout 5000ms', 'Timeout exceeded'], 2);
    expect(new Set(A).size).toBe(2);
});
