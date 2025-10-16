import { request } from 'undici';

export async function putPolicy(rego: string, id = 'cos.abac') {
  const res = await request(`${process.env.OPA_URL}/v1/policies/${id}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'text/plain' },
    body: rego,
  });
  if (res.statusCode >= 300) throw new Error(`OPA putPolicy ${res.statusCode}`);
}

export async function putData(path: string, data: unknown) {
  const res = await request(`${process.env.OPA_URL}/v1/data/${path}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(data),
  });
  if (res.statusCode >= 300) throw new Error(`OPA putData ${res.statusCode}`);
}
