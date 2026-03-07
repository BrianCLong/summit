/**
 * GDELT GKG V2.1 Parser - Clean-room parser aligned to codebook.
 */
export class GDELTGKGParser {
  parseLine(line: string): GKGRecord | null {
    const fields = line.split('\t');
    if (fields.length < 11) return null;

    return {
      gkgRecordId: fields[0],
      date: fields[1],
      sourceCollection: parseInt(fields[2], 10),
      sourceCommonName: fields[3],
      documentIdentifier: fields[4],
      v1Counts: fields[5],
      v2Counts: fields[6],
      v1Themes: fields[7],
      v2Themes: fields[8],
      v1Locations: fields[9],
      v2Locations: fields[10],
      v1Persons: fields[11],
      v2Persons: fields[12],
      v1Organizations: fields[13],
      v2Organizations: fields[14],
      v2Tone: fields[15],
      enhancedDates: fields[16],
      enhancedLocations: fields[17],
      enhancedPersons: fields[18],
      enhancedOrganizations: fields[19],
      enhancedThemes: fields[20],
      xml: fields[21]
    };
  }
}

export interface GKGRecord {
  gkgRecordId: string;
  date: string;
  sourceCollection: number;
  sourceCommonName: string;
  documentIdentifier: string;
  v1Counts?: string;
  v2Counts?: string;
  v1Themes?: string;
  v2Themes?: string;
  v1Locations?: string;
  v2Locations?: string;
  v1Persons?: string;
  v2Persons?: string;
  v1Organizations?: string;
  v2Organizations?: string;
  v2Tone?: string;
  enhancedDates?: string;
  enhancedLocations?: string;
  enhancedPersons?: string;
  enhancedOrganizations?: string;
  enhancedThemes?: string;
  xml?: string;
}
