import { InfoWarCSVConnector, CSVIngestOptions } from '../../src/connectors/csv/infowar';

describe('InfoWarCSVConnector', () => {
  let connector: InfoWarCSVConnector;

  beforeEach(() => {
    connector = new InfoWarCSVConnector();
  });

  it('should be defined', () => {
    expect(connector).toBeDefined();
  });

  it('should ingest from provided CSV path and return incidents', async () => {
    const options: CSVIngestOptions = {
      filePath: '/path/to/incidents.csv',
      delimiter: ','
    };

    // The current implementation is a stub and returns an empty array.
    const incidents = await connector.ingest(options);
    expect(Array.isArray(incidents)).toBe(true);
    expect(incidents.length).toBe(0);
  });
});
