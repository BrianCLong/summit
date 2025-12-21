const banned = [/DETACH\s+DELETE/i, /apoc\.periodic/i, /CALL\s+db\.msql/i];

export function forbidDangerous(query: string){
  if (!query) return;
  const hit = banned.find(rx => rx.test(query));
  if (hit) {
    const err = new Error('dangerous pattern blocked');
    (err as any).pattern = hit.source;
    throw err;
  }
}
