export function canonicalizeJson(obj: any): string {
  if (obj === null || typeof obj !== "object") {
    return JSON.stringify(obj);
  }

  if (Array.isArray(obj)) {
    const arrayElements = obj.map((item) => canonicalizeJson(item));
    return `[${arrayElements.join(",")}]`;
  }

  const keys = Object.keys(obj).sort();
  const keyValuePairs = keys
    .map((key) => {
      // Only include defined values
      if (obj[key] !== undefined) {
        return `${JSON.stringify(key)}:${canonicalizeJson(obj[key])}`;
      }
      return null;
    })
    .filter((pair) => pair !== null);

  return `{${keyValuePairs.join(",")}}`;
}
