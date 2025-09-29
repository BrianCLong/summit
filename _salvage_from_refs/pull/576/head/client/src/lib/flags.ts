const cache: Record<string, any> = {};

export async function getFlag(key: string, bootstrap?: Record<string, any>) {
  if (bootstrap && key in bootstrap) return bootstrap[key];
  if (cache[key] !== undefined) return cache[key];
  const res = await fetch(`/api/flags?key=${key}`);
  const data = await res.json();
  cache[key] = data.value;
  return data.value;
}
