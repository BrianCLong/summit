import { describe, it, expect } from '@jest/globals';
import { CSVInfowarConnector } from '../../src/connectors/csv/infowar/index.js';

describe('CSVInfowarConnector', () => {
  it('should correctly parse CSV with quoted fields', () => {
    const connector = new CSVInfowarConnector();
    const csv = `date,actor,platform,narrative,description
2026-01-13,Actor1,Twitter,"Narrative with, comma","Description here"`;

    const results = connector.parse(csv);

    expect(results).toHaveLength(1);
    expect(results[0].narrative).toBe('Narrative with, comma');
    expect(results[0].description).toBe('Description here');
  });

  it('should skip empty lines', () => {
    const connector = new CSVInfowarConnector();
    const csv = `date,actor,platform,narrative,description
2026-01-13,Actor1,Twitter,N1,D1

2026-01-14,Actor2,FB,N2,D2`;

    const results = connector.parse(csv);
    expect(results).toHaveLength(2);
  });
});
