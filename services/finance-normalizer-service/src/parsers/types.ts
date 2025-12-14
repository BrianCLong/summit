import type {
  Transaction,
  Party,
  Account,
  ImportFormat,
  MonetaryAmount,
} from '@intelgraph/finance-normalizer-types';

/**
 * Raw parsed record from source data
 */
export interface RawRecord {
  /** Line/record number in source */
  lineNumber: number;
  /** Raw field values */
  fields: Record<string, string | null>;
  /** Original raw line/data */
  raw: string;
}

/**
 * Parser configuration options
 */
export interface ParserConfig {
  /** Date format string (e.g., 'YYYY-MM-DD', 'DD/MM/YYYY') */
  dateFormat?: string;
  /** Decimal separator ('.' or ',') */
  decimalSeparator?: '.' | ',';
  /** Thousands separator */
  thousandsSeparator?: string;
  /** Default currency if not specified in data */
  defaultCurrency?: string;
  /** Timezone for dates without timezone info */
  defaultTimezone?: string;
  /** CSV-specific: delimiter character */
  delimiter?: string;
  /** CSV-specific: quote character */
  quoteChar?: string;
  /** CSV-specific: whether file has header row */
  hasHeader?: boolean;
  /** CSV-specific: column mapping */
  columnMapping?: Record<string, string>;
  /** Whether to skip empty rows */
  skipEmptyRows?: boolean;
  /** Custom field transformers */
  transformers?: Record<string, (value: string) => string>;
}

/**
 * Parse result for a single record
 */
export interface ParsedRecord {
  /** Successfully parsed transaction */
  transaction?: Partial<Transaction>;
  /** Parsed party information (originator/beneficiary) */
  parties?: Partial<Party>[];
  /** Parsed account information */
  accounts?: Partial<Account>[];
  /** Parse warnings (non-fatal issues) */
  warnings: ParseWarning[];
  /** Original raw record */
  rawRecord: RawRecord;
}

/**
 * Parse warning for non-fatal issues
 */
export interface ParseWarning {
  code: string;
  message: string;
  field?: string;
  value?: string;
}

/**
 * Parse error for fatal issues
 */
export interface ParseError {
  code: string;
  message: string;
  lineNumber: number;
  field?: string;
  value?: string;
}

/**
 * Complete parse result
 */
export interface ParseResult {
  /** Successfully parsed records */
  records: ParsedRecord[];
  /** Errors that prevented parsing */
  errors: ParseError[];
  /** Total lines/records in source */
  totalRecords: number;
  /** Source format detected/used */
  format: ImportFormat;
  /** Parser configuration used */
  config: ParserConfig;
  /** Parsing metadata */
  metadata: {
    /** Source filename */
    filename?: string;
    /** Parse duration in ms */
    durationMs: number;
    /** Parser version */
    parserVersion: string;
  };
}

/**
 * Base parser interface
 */
export interface Parser {
  /** Format this parser handles */
  format: ImportFormat;

  /** Parse source data */
  parse(
    data: string | Buffer,
    config?: ParserConfig
  ): Promise<ParseResult>;

  /** Validate configuration */
  validateConfig(config: ParserConfig): string[];

  /** Detect if data matches this format */
  detect(data: string | Buffer): boolean;
}

/**
 * Amount parsing result
 */
export interface ParsedAmount {
  amount: MonetaryAmount;
  /** Original string value for audit */
  original: string;
  /** Whether sign was inferred */
  signInferred: boolean;
}

/**
 * Date parsing result
 */
export interface ParsedDate {
  /** ISO 8601 datetime string */
  isoString: string;
  /** Original string value */
  original: string;
  /** Whether time was inferred (default to midnight) */
  timeInferred: boolean;
  /** Whether timezone was inferred */
  timezoneInferred: boolean;
}
