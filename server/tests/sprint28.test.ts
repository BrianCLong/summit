import { mapCsvToGraph, enforceCap } from '../src/services/MigrationService';

describe('MigrationService', () => {
  describe('mapCsvToGraph', () => {
    it('should map CSV to graph entities and edges', async () => {
      const csv = `id,name,role,manager_id
1,Alice,Engineer,2
2,Bob,Manager,
`;
      const mapping = {
        entityType: 'Employee',
        keyPrefix: 'emp',
        keyCol: 'id',
        propMap: [
          { from: 'name', to: 'fullName' },
          { from: 'role', to: 'jobTitle' },
        ],
        edgeType: 'REPORTS_TO',
        edgeFrom: { prefix: 'emp', col: 'id' },
        edgeTo: { prefix: 'emp', col: 'manager_id' },
      };

      const result = await mapCsvToGraph(csv, mapping);

      expect(result.entities).toHaveLength(2);
      expect(result.entities[0]).toEqual({
        type: 'Employee',
        key: 'emp:1',
        props: { fullName: 'Alice', jobTitle: 'Engineer' },
      });
      expect(result.entities[1]).toEqual({
        type: 'Employee',
        key: 'emp:2',
        props: { fullName: 'Bob', jobTitle: 'Manager' },
      });

      expect(result.edges).toHaveLength(1);
      expect(result.edges[0]).toEqual({
        type: 'REPORTS_TO',
        from: 'emp:1',
        to: 'emp:2',
        props: { source: 'csv-import' },
      });

      expect(result.lineage).toHaveLength(2);
    });
  });

  describe('enforceCap', () => {
    const ctx = {
      plan: {
        caps: {
          queries: { soft: 100, hard: 200 },
        },
      },
    };

    it('should return no warning if below soft cap', () => {
      const result = enforceCap(ctx, 'queries', 50);
      expect(result.warning).toBe(false);
    });

    it('should return warning if above soft cap', () => {
      const result = enforceCap(ctx, 'queries', 150);
      expect(result.warning).toBe(true);
      expect(result.message).toContain('Approaching queries cap');
    });

    it('should throw error if above hard cap', () => {
      expect(() => enforceCap(ctx, 'queries', 250)).toThrow(
        'Plan cap reached for queries'
      );
    });
  });
});
