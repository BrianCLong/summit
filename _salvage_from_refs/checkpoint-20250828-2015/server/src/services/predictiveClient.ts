import axios, { AxiosInstance } from 'axios';

export class PredictiveClient {
  private http: AxiosInstance;
  private httpCanary: AxiosInstance | undefined;
  private predictiveUrl: string;
  private predictiveCanaryUrl: string | undefined;
  private predictiveCanaryPct: number;

  constructor(baseURL = process.env.PREDICTIVE_URL || 'http://predictive:8080') {
    this.predictiveUrl = baseURL;
    this.predictiveCanaryUrl = process.env.PREDICTIVE_URL_CANARY;
    this.predictiveCanaryPct = Number(process.env.PREDICTIVE_CANARY_PCT || 0);

    this.http = axios.create({ baseURL: this.predictiveUrl, timeout: 10_000 });
    this.http.interceptors.request.use(cfg => {
      cfg.headers = { ...cfg.headers, Authorization: `Bearer ${process.env.SVC_JWT}` };
      return cfg;
    });

    if (this.predictiveCanaryUrl && this.predictiveCanaryPct > 0) {
      this.httpCanary = axios.create({ baseURL: this.predictiveCanaryUrl, timeout: 10_000 });
      this.httpCanary.interceptors.request.use(cfg => {
        cfg.headers = { ...cfg.headers, Authorization: `Bearer ${process.env.SVC_JWT}` };
        return cfg;
      });
    }
  }

  private getHttpClient(): AxiosInstance {
    if (this.httpCanary && Math.random() * 100 < this.predictiveCanaryPct) {
      return this.httpCanary;
    }
    return this.http;
  }

  suggestLinks(payload: { caseId: string; seedNodeIds: string[]; topK: number; threshold: number }) {
    return this.getHttpClient().post('/lp/suggest', payload).then(r => r.data);
  }
  explain(id: string) {
    return this.getHttpClient().get(`/lp/explain/${id}`).then(r => r.data);
  }
  resolveEntities(payload: any) {
    return this.getHttpClient().post('/er/resolve', payload).then(r => r.data);
  }
}
