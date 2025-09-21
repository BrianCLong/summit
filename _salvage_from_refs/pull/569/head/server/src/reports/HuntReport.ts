function stripPii(row: Record<string, any>) {
  const copy = { ...row };
  delete copy.email;
  delete copy.name;
  return copy;
}

export function generateHuntReport(data: any) {
  const sanitized = {
    ...data,
    results: Array.isArray(data.results) ? data.results.map(stripPii) : []
  };
  return `# Hunt Report\n\n${JSON.stringify(sanitized, null, 2)}`;
}

export default generateHuntReport;
