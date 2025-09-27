export interface SliceHandle {
  name: string;
  version: string;
}

export interface SliceResponse {
  name: string;
  version: string;
  members: string[];
  metadata: Record<string, unknown>;
  created_at: string;
  source?: string | null;
  membership_hash: string;
  provenance_hash: string;
  cardinality: number;
}

export interface DiffResponse {
  slice: string;
  baseline: string;
  candidate: string;
  added: string[];
  removed: string[];
  unchanged: string[];
}

export interface CoverageResponse {
  slice: SliceResponse;
  traffic_total: number;
  captured_weight: number;
  coverage: number;
  label_totals: Record<string, number>;
  captured_by_label: Record<string, number>;
  label_coverage: Record<string, number>;
}

export interface TrafficEvent {
  id: string;
  label?: string;
  weight?: number;
}

type Fetcher = (input: string, init?: RequestInit) => Promise<Response>;

export class SliceRegClient {
  private readonly fetcher: Fetcher;

  constructor(private readonly baseUrl: string, fetcher?: Fetcher) {
    this.fetcher = fetcher ?? (globalThis.fetch as Fetcher);
    if (!this.fetcher) {
      throw new Error('fetch is not available in the current runtime');
    }
  }

  async getSlice(name: string, version: string): Promise<SliceResponse> {
    return this.request(`/slices/${name}/${version}`);
  }

  async getSliceHandle(handle: SliceHandle | string, version?: string): Promise<SliceResponse> {
    if (typeof handle === 'string') {
      if (!version) {
        throw new Error('version is required when using a string handle');
      }
      return this.getSlice(handle, version);
    }
    return this.getSlice(handle.name, handle.version);
  }

  async diff(name: string, baseline: string, candidate: string): Promise<DiffResponse> {
    return this.request(`/slices/${name}/${baseline}/diff/${candidate}`);
  }

  async coverage(name: string, version: string, trafficEvents: TrafficEvent[]): Promise<CoverageResponse> {
    return this.request(`/slices/${name}/${version}/coverage`, {
      method: 'POST',
      body: JSON.stringify({ traffic_events: trafficEvents }),
      headers: {
        'content-type': 'application/json',
      },
    });
  }

  async listVersions(name: string): Promise<SliceResponse[]> {
    return this.request(`/slices/${name}`);
  }

  private async request<T>(path: string, init?: RequestInit): Promise<T> {
    const response = await this.fetcher(`${this.baseUrl}${path}`, init);
    if (!response.ok) {
      const text = await response.text();
      throw new Error(`slice-reg request failed (${response.status}): ${text}`);
    }
    return (await response.json()) as T;
  }
}
