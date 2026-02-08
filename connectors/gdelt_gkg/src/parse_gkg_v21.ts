import { parse } from 'csv-parse';
import { Readable } from 'stream';

// Based on GDELT GKG 2.1 Codebook
// https://data.gdeltproject.org/documentation/GDELT-Global_Knowledge_Graph_Codebook-V2.1.pdf

export interface GkgV21Record {
  GKGRECORDID: string;
  DATE: string; // YYYYMMDDHHMMSS
  SourceCollectionIdentifier: string;
  SourceCommonName: string;
  DocumentIdentifier: string;
  Counts: string;
  V2Counts: string;
  Themes: string;
  V2Themes: string;
  Locations: string;
  V2Locations: string;
  Persons: string;
  V2Persons: string;
  Organizations: string;
  V2Organizations: string;
  Tone: string;
  Dates: string;
  GCAM: string;
  SharingImage: string;
  RelatedImages: string;
  SocialImageEmbeds: string;
  SocialVideoEmbeds: string;
  Quotations: string;
  AllNames: string;
  Amounts: string;
  TranslationInfo: string;
  Extras: string;
}

export const GKG_V21_HEADER = [
  'GKGRECORDID',
  'DATE',
  'SourceCollectionIdentifier',
  'SourceCommonName',
  'DocumentIdentifier',
  'Counts',
  'V2Counts',
  'Themes',
  'V2Themes',
  'Locations',
  'V2Locations',
  'Persons',
  'V2Persons',
  'Organizations',
  'V2Organizations',
  'Tone',
  'Dates',
  'GCAM',
  'SharingImage',
  'RelatedImages',
  'SocialImageEmbeds',
  'SocialVideoEmbeds',
  'Quotations',
  'AllNames',
  'Amounts',
  'TranslationInfo',
  'Extras'
];

export function parseGkgV21Stream(inputStream: Readable): Readable {
  return inputStream.pipe(parse({
    delimiter: '\t', // GKG is tab-separated
    columns: false, // We will manually map columns to be safe or assume order
    relax_quotes: true,
    relax_column_count: true,
    skip_empty_lines: true
  }));
}

export function mapRowToRecord(row: string[]): GkgV21Record {
  // GKG 2.1 has exactly 27 columns usually, but we map by index
  // If row has fewer columns, we fill with empty string

  const get = (index: number) => row[index] || '';

  return {
    GKGRECORDID: get(0),
    DATE: get(1),
    SourceCollectionIdentifier: get(2),
    SourceCommonName: get(3),
    DocumentIdentifier: get(4),
    Counts: get(5),
    V2Counts: get(6),
    Themes: get(7),
    V2Themes: get(8),
    Locations: get(9),
    V2Locations: get(10),
    Persons: get(11),
    V2Persons: get(12),
    Organizations: get(13),
    V2Organizations: get(14),
    Tone: get(15),
    Dates: get(16),
    GCAM: get(17),
    SharingImage: get(18),
    RelatedImages: get(19),
    SocialImageEmbeds: get(20),
    SocialVideoEmbeds: get(21),
    Quotations: get(22),
    AllNames: get(23),
    Amounts: get(24),
    TranslationInfo: get(25),
    Extras: get(26)
  };
}
