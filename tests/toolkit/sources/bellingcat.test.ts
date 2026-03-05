import { BellingcatImporter } from '../../../src/toolkit/sources/bellingcat.js';
import { normalizeToolId } from '../../../src/toolkit/normalize.js';

describe('BellingcatImporter', () => {
  it('should parse CSV correctly', () => {
    const importer = new BellingcatImporter();
    const csvContent = `name,category,url,description
Test Tool,Maps,https://test.com,"Test Description, account required"
Another Tool,Search,https://search.com,"No account needed"`;

    const tools = importer.parseCSV(csvContent);
    expect(tools).toHaveLength(2);
    expect(tools[0].name).toBe('Test Tool');
    expect(tools[0].authNeeded).toBe(true);
    expect(tools[1].authNeeded).toBe(false);
    expect(tools[0].id).toBe(normalizeToolId('bellingcat', 'Test Tool'));
  });
});
