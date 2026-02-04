export function redactSecrets(obj: any): any {
  if (typeof obj === "string") {
    if (obj.startsWith("data:image/") && obj.includes(";base64,")) {
      return "[REDACTED_IMAGE_BASE64]";
    }
    // Simple heuristic for base64 long strings
    if (obj.length > 500 && /^[A-Za-z0-9+/=]+$/.test(obj)) {
        return "[REDACTED_BASE64_LIKELY]";
    }
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(redactSecrets);
  }

  if (obj && typeof obj === "object") {
    const newObj: any = {};
    for (const key in obj) {
        if (key.toLowerCase().includes("auth") || key.toLowerCase().includes("api_key") || key.toLowerCase().includes("apikey")) {
            newObj[key] = "[REDACTED]";
        } else {
            newObj[key] = redactSecrets(obj[key]);
        }
    }
    return newObj;
  }

  return obj;
}
