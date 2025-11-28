import type { ImportFormat } from '@intelgraph/finance-normalizer-types';
import type { Parser, ParserConfig, ParseResult } from './types.js';
import { csvParser } from './csv.js';
import { swiftParser } from './swift.js';
import { bankApiParser } from './bankApi.js';

export * from './types.js';
export * from './utils.js';
export { csvParser } from './csv.js';
export { swiftParser } from './swift.js';
export { bankApiParser } from './bankApi.js';

/**
 * Registry of available parsers
 */
const parserRegistry: Map<ImportFormat, Parser> = new Map([
  ['CSV', csvParser],
  ['SWIFT_MT940', swiftParser],
  ['SWIFT_MT942', swiftParser],
  ['SWIFT_MT103', swiftParser],
  ['JSON', bankApiParser],
]);

/**
 * Get parser for a specific format
 */
export function getParser(format: ImportFormat): Parser | undefined {
  return parserRegistry.get(format);
}

/**
 * Auto-detect format and return appropriate parser
 */
export function detectParser(data: string | Buffer): Parser | undefined {
  for (const parser of parserRegistry.values()) {
    if (parser.detect(data)) {
      return parser;
    }
  }
  return undefined;
}

/**
 * Parse data with auto-detection or specified format
 */
export async function parseData(
  data: string | Buffer,
  format?: ImportFormat,
  config?: ParserConfig
): Promise<ParseResult> {
  let parser: Parser | undefined;

  if (format) {
    parser = getParser(format);
    if (!parser) {
      return {
        records: [],
        errors: [{
          code: 'UNSUPPORTED_FORMAT',
          message: `Format '${format}' is not supported`,
          lineNumber: 0,
        }],
        totalRecords: 0,
        format,
        config: config || {},
        metadata: {
          durationMs: 0,
          parserVersion: '1.0.0',
        },
      };
    }
  } else {
    parser = detectParser(data);
    if (!parser) {
      return {
        records: [],
        errors: [{
          code: 'FORMAT_DETECTION_FAILED',
          message: 'Could not detect data format',
          lineNumber: 0,
        }],
        totalRecords: 0,
        format: 'CUSTOM',
        config: config || {},
        metadata: {
          durationMs: 0,
          parserVersion: '1.0.0',
        },
      };
    }
  }

  // Validate config
  if (config) {
    const configErrors = parser.validateConfig(config);
    if (configErrors.length > 0) {
      return {
        records: [],
        errors: configErrors.map((msg, i) => ({
          code: 'INVALID_CONFIG',
          message: msg,
          lineNumber: 0,
        })),
        totalRecords: 0,
        format: parser.format,
        config,
        metadata: {
          durationMs: 0,
          parserVersion: '1.0.0',
        },
      };
    }
  }

  return parser.parse(data, config);
}

/**
 * List all supported formats
 */
export function getSupportedFormats(): ImportFormat[] {
  return Array.from(parserRegistry.keys());
}
