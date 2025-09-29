import fetch from 'node-fetch';

export class OpaClient {
  static async evaluate(policy: string, input: any): Promise<any> {
    const url = `${process.env.OPA_URL || 'http://localhost:8181/v1/data'}/${policy}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ input })
    });
    if (!res.ok) {
      return { allow: false, deny_reason: 'opa_error' };
    }
    const data = await res.json();
    return data.result || { allow: false };
  }
}
