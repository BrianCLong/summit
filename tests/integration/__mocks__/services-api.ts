type Response<T = any> = { ok: boolean; status: number; json: () => Promise<T> };
const toResponse = <T>(body: T, status = 200): Response<T> => ({
  ok: status < 400,
  status,
  json: async () => body,
});

export async function get(path: string) {
  return toResponse({ path, method: 'GET' });
}

export async function post(path: string, body?: unknown) {
  return toResponse({ path, method: 'POST', body }, 202);
}

export async function put(path: string, body?: unknown) {
  return toResponse({ path, method: 'PUT', body });
}

export async function del(path: string) {
  return toResponse({ path, method: 'DELETE' }, 204);
}

export default { get, post, put, del };
