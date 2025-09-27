import type {
  ConnectorSnapshot,
  DSARConnector,
  ExportStorage,
  KafkaEventLog,
} from './types';

export interface PostgresRow {
  table: string;
  subjectId: string;
  tenantId: string;
  data: Record<string, unknown>;
}

const clone = <T>(value: T): T => {
  if (typeof structuredClone === 'function') {
    return structuredClone(value);
  }
  return JSON.parse(JSON.stringify(value)) as T;
};

const cloneRows = (rows: PostgresRow[]): PostgresRow[] => rows.map((row) => ({ ...row, data: clone(row.data) }));

export class InMemoryPostgresConnector implements DSARConnector<PostgresRow[]> {
  public readonly name = 'postgres';
  private rows: PostgresRow[];
  public readonly calls = { collect: 0, rectify: 0, delete: 0 };

  constructor(rows: PostgresRow[]) {
    this.rows = cloneRows(rows);
  }

  private subjects(): string[] {
    return Array.from(new Set(this.rows.map((row) => row.subjectId))).sort();
  }

  private orderedRows(): PostgresRow[] {
    return cloneRows(
      this.rows
        .slice()
        .sort((a, b) => `${a.subjectId}:${a.table}`.localeCompare(`${b.subjectId}:${b.table}`)),
    );
  }

  async collect(subjectId: string, tenantId: string): Promise<PostgresRow[]> {
    this.calls.collect += 1;
    return this.orderedRows().filter((row) => row.subjectId === subjectId && row.tenantId === tenantId);
  }

  async rectify(
    subjectId: string,
    tenantId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    this.calls.rectify += 1;
    Object.entries(patch).forEach(([table, value]) => {
      const target = this.rows.find(
        (row) => row.subjectId === subjectId && row.tenantId === tenantId && row.table === table,
      );
      if (target) {
        target.data = { ...target.data, ...(value as Record<string, unknown>) };
      } else {
        this.rows.push({
          table,
          tenantId,
          subjectId,
          data: clone(value as Record<string, unknown>),
        });
      }
    });
  }

  async delete(subjectId: string, tenantId: string): Promise<void> {
    this.calls.delete += 1;
    this.rows = this.rows.filter((row) => !(row.subjectId === subjectId && row.tenantId === tenantId));
  }

  async snapshot(): Promise<ConnectorSnapshot<PostgresRow[]>> {
    return {
      data: this.orderedRows(),
      subjectIds: this.subjects(),
    };
  }

  getRows(subjectId: string, tenantId: string): PostgresRow[] {
    return cloneRows(this.rows.filter((row) => row.subjectId === subjectId && row.tenantId === tenantId));
  }
}

export interface ElasticsearchDocument {
  id: string;
  subjectId: string;
  tenantId: string;
  index: string;
  body: Record<string, unknown>;
}

const cloneDocuments = (documents: ElasticsearchDocument[]): ElasticsearchDocument[] =>
  documents.map((doc) => ({ ...doc, body: clone(doc.body) }));

export class InMemoryElasticsearchConnector implements DSARConnector<ElasticsearchDocument[]> {
  public readonly name = 'elasticsearch';
  private documents: ElasticsearchDocument[];
  public readonly calls = { collect: 0, rectify: 0, delete: 0 };

  constructor(documents: ElasticsearchDocument[]) {
    this.documents = cloneDocuments(documents);
  }

  private subjects(): string[] {
    return Array.from(new Set(this.documents.map((doc) => doc.subjectId))).sort();
  }

  private orderedDocuments(): ElasticsearchDocument[] {
    return cloneDocuments(
      this.documents
        .slice()
        .sort((a, b) => `${a.subjectId}:${a.index}:${a.id}`.localeCompare(`${b.subjectId}:${b.index}:${b.id}`)),
    );
  }

  async collect(subjectId: string, tenantId: string): Promise<ElasticsearchDocument[]> {
    this.calls.collect += 1;
    return this.orderedDocuments().filter((doc) => doc.subjectId === subjectId && doc.tenantId === tenantId);
  }

  async rectify(
    subjectId: string,
    tenantId: string,
    patch: Record<string, unknown>,
  ): Promise<void> {
    this.calls.rectify += 1;
    Object.entries(patch).forEach(([index, value]) => {
      this.documents
        .filter((doc) => doc.subjectId === subjectId && doc.tenantId === tenantId && doc.index === index)
        .forEach((doc) => {
          doc.body = { ...doc.body, ...(value as Record<string, unknown>) };
        });
    });
  }

  async delete(subjectId: string, tenantId: string): Promise<void> {
    this.calls.delete += 1;
    this.documents = this.documents.filter(
      (doc) => !(doc.subjectId === subjectId && doc.tenantId === tenantId),
    );
  }

  async snapshot(): Promise<ConnectorSnapshot<ElasticsearchDocument[]>> {
    return {
      data: this.orderedDocuments(),
      subjectIds: this.subjects(),
    };
  }

  getDocuments(subjectId: string, tenantId: string): ElasticsearchDocument[] {
    return cloneDocuments(this.documents.filter((doc) => doc.subjectId === subjectId && doc.tenantId === tenantId));
  }
}

export class InMemoryKafkaEventLog implements KafkaEventLog {
  private events: Record<string, unknown>[] = [];

  async publish(topic: string, message: Record<string, unknown>): Promise<void> {
    this.events.push({ topic, ...clone(message) });
  }

  history(): Record<string, unknown>[] {
    return this.events.slice();
  }
}

export class InMemoryS3Storage implements ExportStorage {
  private readonly bucket: Map<string, string> = new Map();

  constructor(private readonly baseUri = 's3://dfe-fixtures') {}

  async putObject(key: string, body: string): Promise<string> {
    this.bucket.set(key, body);
    return `${this.baseUri}/${key}`;
  }

  async getObject(key: string): Promise<string | undefined> {
    return this.bucket.get(key);
  }
}
