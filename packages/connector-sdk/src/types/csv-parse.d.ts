/**
 * Type declarations for csv-parse
 * This package is an optional dependency and dynamically imported
 */
declare module "csv-parse" {
  import { Transform } from "stream";

  export interface Options {
    delimiter?: string;
    columns?: boolean | string[];
    skip_records_with_error?: boolean;
    from_line?: number;
    to_line?: number;
    trim?: boolean;
    relax_quotes?: boolean;
    [key: string]: any;
  }

  export function parse(options?: Options): Transform;
}
