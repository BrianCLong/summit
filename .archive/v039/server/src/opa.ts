import fetch from 'node-fetch';

const OPA_URL =
  process.env.OPA_URL || 'http://opa:8181/v1/data/mc/admin/decision';

export function makeAuthz() {
  return async function authorize(input: any) {
    // Call OPA; if unreachable, fail-closed
    try {
      const r = await fetch(OPA_URL, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify({ input }),
      });
      if (!r.ok) throw new Error(`opa_http_${r.status}`);
      const { result } = await r.json();
      return result || { allow: false, deny: ['opa_no_result'] };
    } catch (e: any) {
      return { allow: false, deny: ['opa_unreachable'] };
    }
  };
}
