const API = import.meta.env.VITE_COMPANYOS_API;
const DEV_BEARER = import.meta.env.VITE_DEV_BEARER || '';

async function http(path, { method = 'GET', body } = {}) {
  if (!API) throw new Error('VITE_COMPANYOS_API is not set');
  const headers = { 'content-type': 'application/json' };
  if (DEV_BEARER) headers.authorization = `Bearer ${DEV_BEARER}`;
  const res = await fetch(`${API}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
    credentials: 'include',
  });
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json().catch(() => ({}));
}

export const CompanyOS = {
  // Example: OPA policy check behind CompanyOS
  async policyCheck(input) {
    // Convention: CompanyOS exposes a policy decision endpoint
    // POST /v1/policy/check => { allow, reason }
    try {
      return await http('/v1/policy/check', { method: 'POST', body: input });
    } catch (e) {
      // On failure, be safe-by-default (block) and include reason
      return { allow: false, reason: `policy service unavailable: ${e.message}` };
    }
  },

  // Example: auth/session fetch
  async me() {
    try {
      return await http('/v1/me');
    } catch {
      return { anonymous: true };
    }
  },
};