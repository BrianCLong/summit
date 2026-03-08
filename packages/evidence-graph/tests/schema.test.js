"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const schema_1 = require("../schema/schema");
describe('Evidence Graph Schema invariants', () => {
    it('should have required nodes defined', () => {
        expect(schema_1.schema).toHaveProperty('entities');
        expect(schema_1.schema).toHaveProperty('claims');
        expect(schema_1.schema).toHaveProperty('evidence_blobs');
        expect(schema_1.schema).toHaveProperty('provenance_edges');
    });
});
