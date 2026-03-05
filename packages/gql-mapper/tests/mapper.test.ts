import { mapGQLToCypher } from '../src/mapper';

describe('GQL Mapper', () => {
    it('should map a supported query', () => {
        const gqlQuery = 'MATCH (n) GQL RETURN n';
        const expectedCypher = 'MATCH (n) Cypher RETURN n';
        expect(mapGQLToCypher(gqlQuery)).toBe(expectedCypher);
    });

    it('should throw an error for unsupported queries', () => {
        expect(() => mapGQLToCypher('UNSUPPORTED_KEYWORD')).toThrow('UNSUPPORTED_KEYWORD is not supported in this subset of GQL.');
    });
});
