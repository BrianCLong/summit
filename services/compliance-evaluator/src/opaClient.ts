import { request } from 'undici';

export type OpaDecision = {
  result?: {
    allow?: boolean;
    decision?: {
      control_id: string;
      result: 'PASS' | 'FAIL';
      reasons: string[];
    };
  };
};

export class OpaClient {
  constructor(private readonly opaUrl: string) {}

  async evaluate(input: unknown): Promise<OpaDecision> {
    const url = `${this.opaUrl}/v1/data/compliance`;
    const res = await request(url, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ input })
    });

    if (res.statusCode < 200 || res.statusCode >= 300) {
      const text = await res.body.text();
      throw new Error(`OPA error ${res.statusCode}: ${text}`);
    }

    return (await res.body.json()) as OpaDecision;
  }
}
