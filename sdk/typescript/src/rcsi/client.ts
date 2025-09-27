import type {
  DocumentInput,
  IndexSnapshot,
  Proof,
  ReconcileReport,
  RedactionEvent,
} from './types';
import { validateProof } from './proof';

export interface ClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
}

const defaultHeaders = {
  'Content-Type': 'application/json',
};

export class RCSIClient {
  private readonly baseUrl: string;
  private readonly fetchImpl: typeof fetch;

  constructor(options: ClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, '');
    this.fetchImpl = options.fetchImpl ?? fetch;
  }

  async addDocument(document: DocumentInput): Promise<void> {
    await this.post('/documents', document);
  }

  async applyRedaction(event: RedactionEvent): Promise<void> {
    if (event.type === 'document') {
      await this.post('/redactions/document', {
        documentId: event.documentId,
        reason: event.reason,
      });
    } else {
      await this.post('/redactions/term', {
        term: event.term,
        documentId: event.documentId,
        reason: event.reason,
      });
    }
  }

  async selectiveReindex(documentIds: string[]): Promise<void> {
    await this.post('/reindex', { documentIds });
  }

  async reconcile(): Promise<ReconcileReport> {
    return this.get<ReconcileReport>('/reconcile');
  }

  async snapshot(): Promise<IndexSnapshot> {
    return this.get<IndexSnapshot>('/snapshot');
  }

  async getDocumentProof(documentId: string): Promise<Proof> {
    const proof = await this.get<Proof>(`/proofs/doc/${encodeURIComponent(documentId)}`);
    return proof;
  }

  async getTermProof(term: string, documentId: string): Promise<Proof> {
    const proof = await this.get<Proof>(
      `/proofs/term/${encodeURIComponent(term)}?documentId=${encodeURIComponent(documentId)}`,
    );
    return proof;
  }

  async validateDocumentProof(documentId: string, snapshot?: IndexSnapshot): Promise<void> {
    const proof = await this.getDocumentProof(documentId);
    const snap = snapshot ?? (await this.snapshot());
    validateProof(proof, snap);
  }

  async validateTermProof(term: string, documentId: string, snapshot?: IndexSnapshot): Promise<void> {
    const proof = await this.getTermProof(term, documentId);
    const snap = snapshot ?? (await this.snapshot());
    validateProof(proof, snap);
  }

  private async post(path: string, body: unknown): Promise<void> {
    const response = await this.fetchImpl(this.buildUrl(path), {
      method: 'POST',
      headers: defaultHeaders,
      body: JSON.stringify(body),
    });
    if (!response.ok) {
      throw new Error(`request failed (${response.status}): ${await response.text()}`);
    }
  }

  private async get<T>(path: string): Promise<T> {
    const response = await this.fetchImpl(this.buildUrl(path));
    if (!response.ok) {
      throw new Error(`request failed (${response.status}): ${await response.text()}`);
    }
    return (await response.json()) as T;
  }

  private buildUrl(path: string): string {
    return `${this.baseUrl}${path}`;
  }
}

