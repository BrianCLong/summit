"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const mapper_1 = require("../src/mapper");
describe('GQL Mapper', () => {
    it('should map a supported query', () => {
        const gqlQuery = 'MATCH (n) GQL RETURN n';
        const expectedCypher = 'MATCH (n) Cypher RETURN n';
        expect((0, mapper_1.mapGQLToCypher)(gqlQuery)).toBe(expectedCypher);
    });
    it('should throw an error for unsupported queries', () => {
        expect(() => (0, mapper_1.mapGQLToCypher)('UNSUPPORTED_KEYWORD')).toThrow('UNSUPPORTED_KEYWORD is not supported in this subset of GQL.');
    });
});
