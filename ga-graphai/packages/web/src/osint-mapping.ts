export interface OsintMappingSuggestion {
  field: string;
  nodeType: string;
  property: string;
  piiWarning?: string;
}

const EMAIL_REGEX = /[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i;
const PHONE_REGEX = /\+?\d[\d\s().-]{7,}\d/;

export function detectPii(value: string): string | undefined {
  if (EMAIL_REGEX.test(value)) {
    return "email";
  }
  if (PHONE_REGEX.test(value)) {
    return "phone";
  }
  return undefined;
}

export function buildOsintMappingSuggestions(
  record: Record<string, string>
): OsintMappingSuggestion[] {
  const suggestions: OsintMappingSuggestion[] = [];
  Object.entries(record).forEach(([field, value]) => {
    let nodeType = "Document";
    let property = field;
    if (field === "title") {
      nodeType = "Report";
      property = "title";
    }
    if (field === "link") {
      nodeType = "Source";
      property = "url";
    }
    const piiWarning = value ? detectPii(value) : undefined;
    suggestions.push({
      field,
      nodeType,
      property,
      piiWarning,
    });
  });
  return suggestions;
}
