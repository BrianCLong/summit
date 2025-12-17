import axios, { AxiosInstance } from 'axios';
import { DataRecord, IngestionResult, IngestionSource } from './types.js';

const asArray = (input: unknown): unknown[] => {
  if (Array.isArray(input)) {
    return input;
  }
  if (input === undefined || input === null) {
    return [];
  }
  return [input];
};

export class CsvSource implements IngestionSource {
  name: string;
  private readonly csv: string;
  private readonly delimiter: string;

  constructor(
    name: string,
    csv: string,
    options: { delimiter?: string } = {}
  ) {
    this.name = name;
    this.csv = csv;
    this.delimiter = options.delimiter ?? ',';
  }

  async load(): Promise<IngestionResult> {
    const [headerRow, ...rows] = this.csv
      .split(/\r?\n/)
      .filter((line) => line.trim().length > 0);
    const headers = headerRow.split(this.delimiter).map((value) => value.trim());

    const records = rows.map((row) => {
      const values = row.split(this.delimiter);
      return headers.reduce<DataRecord>((acc, header, index) => {
        acc[header] = values[index]?.trim();
        return acc;
      }, {});
    });

    return { source: this.name, records };
  }
}

export class JsonSource implements IngestionSource {
  name: string;
  private readonly payload: unknown;

  constructor(name: string, payload: unknown) {
    this.name = name;
    this.payload = payload;
  }

  async load(): Promise<IngestionResult> {
    const records = asArray(this.payload).map((record) => ({
      ...((record as DataRecord) ?? {}),
    }));
    return { source: this.name, records };
  }
}

export class ApiSource implements IngestionSource {
  name: string;
  private readonly client: AxiosInstance;
  private readonly url: string;
  private readonly params?: Record<string, unknown>;
  private readonly headers?: Record<string, string>;
  private readonly recordsPath?: string | string[];
  private readonly cursorParam?: string;
  private readonly cursorPath?: string | string[];
  private readonly pageSizeParam?: string;
  private readonly pageSize?: number;

  constructor(
    name: string,
    url: string,
    options: {
      client?: AxiosInstance;
      params?: Record<string, unknown>;
      headers?: Record<string, string>;
      recordsPath?: string | string[];
      cursorParam?: string;
      cursorPath?: string | string[];
      pageSizeParam?: string;
      pageSize?: number;
    } = {}
  ) {
    this.name = name;
    this.url = url;
    this.client = options.client ?? axios.create();
    this.params = options.params;
    this.headers = options.headers;
    this.recordsPath = options.recordsPath;
    this.cursorParam = options.cursorParam;
    this.cursorPath = options.cursorPath;
    this.pageSizeParam = options.pageSizeParam;
    this.pageSize = options.pageSize;
  }

  async load(cursor?: string | number): Promise<IngestionResult> {
    const params = { ...this.params };
    if (cursor !== undefined && this.cursorParam) {
      params[this.cursorParam] = cursor;
    }
    if (this.pageSize !== undefined && this.pageSizeParam) {
      params[this.pageSizeParam] = this.pageSize;
    }

    const response = await this.client.get(this.url, { params, headers: this.headers });
    const payload = response.data;
    const recordPayload = this.extractPath(payload, this.recordsPath) ?? payload;
    const records = asArray(recordPayload).map((record) => ({
      ...((record as DataRecord) ?? {}),
    }));
    const cursorCandidate = this.extractPath(payload, this.cursorPath);
    const nextCursor =
      typeof cursorCandidate === 'string' || typeof cursorCandidate === 'number'
        ? cursorCandidate
        : undefined;

    return { source: this.name, records, cursor: nextCursor };
  }

  private extractPath(payload: unknown, path?: string | string[]): unknown {
    if (!path) {
      return payload;
    }
    const keys = Array.isArray(path) ? path : path.split('.');
    return keys.reduce<unknown>((value, key) => {
      if (value && typeof value === 'object' && !Array.isArray(value)) {
        return (value as Record<string, unknown>)[key];
      }
      return undefined;
    }, payload);
  }
}

export class DatabaseSource implements IngestionSource {
  name: string;
  private readonly queryExecutor: (
    cursor?: string | number
  ) => Promise<{ rows: unknown[]; cursor?: string | number }>;

  constructor(
    name: string,
    queryExecutor: (
      cursor?: string | number
    ) => Promise<{ rows: unknown[]; cursor?: string | number }>
  ) {
    this.name = name;
    this.queryExecutor = queryExecutor;
  }

  async load(cursor?: string | number): Promise<IngestionResult> {
    const { rows, cursor: nextCursor } = await this.queryExecutor(cursor);
    const records = asArray(rows).map((record) => ({
      ...((record as DataRecord) ?? {}),
    }));

    return {
      source: this.name,
      records,
      cursor: nextCursor,
    };
  }
}
