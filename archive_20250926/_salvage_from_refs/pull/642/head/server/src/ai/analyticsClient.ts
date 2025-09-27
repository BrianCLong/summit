import axios, { AxiosInstance } from "axios";

export interface Entity {
  text: string;
  label: string;
}

export interface Relationship {
  source: string;
  target: string;
  type: string;
  confidence: number;
  reason: string;
}

export interface NodeInput {
  id: string;
  type: string;
}

export interface EdgeInput {
  source: string;
  target: string;
  type: string;
}

class AnalyticsClient {
  private client: AxiosInstance;
  private failures = 0;
  private circuitOpen = false;
  private readonly threshold = 3;
  private readonly resetMs = 30000;

  constructor(baseURL = process.env.ANALYTICS_URL || "http://localhost:8000") {
    this.client = axios.create({ baseURL, timeout: 500 });
  }

  private async post<T>(url: string, data: any, retries = 2): Promise<T> {
    if (this.circuitOpen) {
      throw new Error("circuit open");
    }
    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const res = await this.client.post<T>(url, data);
        this.failures = 0;
        return res.data;
      } catch (err) {
        this.failures += 1;
        if (this.failures > this.threshold) {
          this.tripCircuit();
        }
        if (attempt === retries) {
          throw err;
        }
      }
    }
    throw new Error("unreachable");
  }

  private tripCircuit() {
    this.circuitOpen = true;
    setTimeout(() => {
      this.circuitOpen = false;
      this.failures = 0;
    }, this.resetMs).unref();
  }

  async extractEntities(text: string): Promise<{ entities: Entity[] }> {
    return this.post("/v1/extract", { text });
  }

  async linkSuggestions(nodes: NodeInput[], edges: EdgeInput[]): Promise<{ suggestions: Relationship[] }> {
    return this.post("/v1/linkify", { nodes, edges });
  }
}

export const analyticsClient = new AnalyticsClient();
export default AnalyticsClient;
