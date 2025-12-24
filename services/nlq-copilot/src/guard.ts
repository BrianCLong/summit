export function forbidDangerous(cypher: string) {
  const banned = [/DETACH\s+DELETE/i, /CALL\s+db\.msql/i, /apoc\.periodic/i];
  if (banned.some((rx) => rx.test(cypher))) {
    throw new Error('dangerous_query');
  }
  return true;
}

export function estimate(cypher: string) {
  const m = /LIMIT\s+(\d+)/i.exec(cypher);
  return { rows: m ? Number(m[1]) : 1000 };
}
