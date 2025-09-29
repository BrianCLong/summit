export type NLKey = { intent: string; filters: Record<string, any> };
export type Plan = { cypher: string; params: Record<string, any>; cost: number };

const keyOf = (k: NLKey) => JSON.stringify(k);
const cache = new Map<string, Plan>();

export function getPlan(k: NLKey): Plan | undefined { return cache.get(keyOf(k)); }
export function setPlan(k: NLKey, p: Plan) { cache.set(keyOf(k), p); }
export function stats() { return { size: cache.size }; }
