import { schema } from '../schema/schema';

describe('Evidence Graph Schema invariants', () => {
    it('should have required nodes defined', () => {
        expect(schema).toHaveProperty('entities');
        expect(schema).toHaveProperty('claims');
        expect(schema).toHaveProperty('evidence_blobs');
        expect(schema).toHaveProperty('provenance_edges');
    });
});
