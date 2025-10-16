declare module 'csv-parse' {
  export interface Options {
    delimiter?: string;
    columns?: boolean;
    skip_empty_lines?: boolean;
    encoding?: string;
  }
  export function parse(options?: Options): NodeJS.ReadWriteStream;
}
