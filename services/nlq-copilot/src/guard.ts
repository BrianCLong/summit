const dangerous = [/DETACH\s+DELETE/i, /apoc\.periodic/i, /CALL\s+db\.msql/i];

export function forbidDangerous(query: string) {
  if (dangerous.some((rx) => rx.test(query))) {
    throw new Error('dangerous pattern');
  }
  return query;
}
