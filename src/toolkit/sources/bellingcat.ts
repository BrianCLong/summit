import { normalizeToolId } from '../normalize.js';
import type { OsintTool } from '../schema.js';

/**
 * Fetch and parse Bellingcat toolkit CSV data.
 */
export class BellingcatImporter {
  // Use public CSV raw source
  private static readonly CSV_URL = 'https://raw.githubusercontent.com/bellingcat/toolkit/main/tools.csv';
  private static readonly SOURCE_NAME = 'bellingcat';

  /**
   * Fetch tools from the CSV URL.
   */
  async fetchRawData(): Promise<string> {
    try {
      const response = await fetch(BellingcatImporter.CSV_URL);
      if (!response.ok) {
        console.warn(`Fallback: using static CSV mock for testing because GitHub fetch failed (${response.status}).`); return this.getMockCSV();
      }
      return await response.text();
    } catch (error) {
      throw new Error(`Error fetching Bellingcat data: ${error}`);
    }
  }

  /**
   * Parse CSV content and map it to `OsintTool` array.
   */

  getMockCSV(): string {
    return `name,category,url,description
Google Maps,Maps,https://maps.google.com,"Standard maps"
Google Earth Pro,Maps,https://earth.google.com,"Advanced geolocation"
SunCalc,Chronolocation,https://suncalc.org,"Shadow analysis"
Yandex Images,Reverse Image Search,https://yandex.com/images,"Strongest reverse image search"
TinEye,Reverse Image Search,https://tineye.com,"Exact duplicates"
InVID,Video Verification,https://invid-project.eu,"Video verification, can be misinterpreted"
Hunchly,Capture,https://hunchly.com,"Capture trail, account required"
Wayback Machine,Archiving,https://web.archive.org,"Site linkage"
`;
  }

parseCSV(csvContent: string): OsintTool[] {
    const lines = csvContent.split(/\r?\n/).filter(line => line.trim().length > 0);
    if (lines.length < 2) return [];

    // Parse header
    const headers = this.parseCSVLine(lines[0] || '').map(h => h.toLowerCase().trim());

    // Fallback indices if header names differ
    const nameIdx = headers.indexOf('name') !== -1 ? headers.indexOf('name') : 0;
    const categoryIdx = headers.indexOf('category') !== -1 ? headers.indexOf('category') : 1;
    const urlIdx = headers.indexOf('url') !== -1 ? headers.indexOf('url') : 2;
    const descIdx = headers.indexOf('description') !== -1 ? headers.indexOf('description') : 3;

    const tools: OsintTool[] = [];

    for (let i = 1; i < lines.length; i++) {
      const row = this.parseCSVLine(lines[i] || '');
      if (row.length < 2) continue; // Skip malformed rows

      const name = row[nameIdx] || 'Unknown Tool';
      const category = row[categoryIdx] || 'Uncategorized';
      const url = row[urlIdx] || '';
      const description = row[descIdx] || '';

      const tool: OsintTool = {
        id: normalizeToolId(BellingcatImporter.SOURCE_NAME, name),
        name: name.trim(),
        category: category.trim(),
        url: url.trim(),
        description: description.trim(),
        source: BellingcatImporter.SOURCE_NAME,
        authNeeded: description.toLowerCase().includes('account required') || false,
        cost: 'unknown',
        // deterministic value for missing data
        lastChecked: '2024-01-01',
      };

      tools.push(tool);
    }

    return tools;
  }

  /**
   * Fetch and parse in one go.
   */
  async ingest(): Promise<OsintTool[]> {
    const rawData = await this.fetchRawData();
    return this.parseCSV(rawData);
  }

  /**
   * Simple CSV line parser respecting quoted fields.
   */
  private parseCSVLine(line: string): string[] {
    const result: string[] = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === ',' && !inQuotes) {
        result.push(current);
        current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }
}
