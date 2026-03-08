"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const crdt_1 = require("../src/crdt");
test('CRDT insert and delete', () => {
    const doc = new crdt_1.TextCRDT('hi');
    doc.apply({ insert: { pos: 2, value: '!' } });
    expect(doc.value()).toBe('hi!');
    doc.apply({ delete: { pos: 1, count: 1 } });
    expect(doc.value()).toBe('h!');
});
