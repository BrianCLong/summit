import * as crypto from "crypto";

export function generateDeterministicHash(data: any): string {
  if (data === undefined) {
    throw new Error("Cannot hash undefined data");
  }

  // Handle strings and numbers directly
  if (typeof data === "string" || typeof data === "number" || typeof data === "boolean") {
    return crypto.createHash("sha256").update(String(data)).digest("hex");
  }

  if (Array.isArray(data)) {
    const itemsHash = data.map((item) => generateDeterministicHash(item)).join("");
    return crypto.createHash("sha256").update(itemsHash).digest("hex");
  }

  // Handle objects deterministically
  if (typeof data === "object" && data !== null) {
    const keys = Object.keys(data).sort();
    const sortedObj: any = {};
    for (const key of keys) {
      // Ignore non-deterministic keys
      if (!["createdAt", "updatedAt", "timestamp", "generatedAt", "runId"].includes(key)) {
        sortedObj[key] = data[key];
      }
    }
    const jsonString = JSON.stringify(sortedObj, (key, value) => {
      if (value === null) return value;
      if (typeof value === "object" && !Array.isArray(value)) {
        const sortedObject = Object.keys(value)
          .sort()
          .reduce((acc: any, currentKey) => {
            acc[currentKey] = value[currentKey];
            return acc;
          }, {});
        return sortedObject;
      }
      return value;
    });

    return crypto.createHash("sha256").update(jsonString).digest("hex");
  }

  throw new Error(`Unsupported data type for hashing: ${typeof data}`);
}

export function generateEntityId(entityType: string, canonicalName: string): string {
  const normalizedName = canonicalName.trim().toLowerCase();
  return generateDeterministicHash({ type: entityType, name: normalizedName });
}

export function generateRelationshipId(
  sourceId: string,
  targetId: string,
  relType: string
): string {
  return generateDeterministicHash({ source: sourceId, target: targetId, type: relType });
}
