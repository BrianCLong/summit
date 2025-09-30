export function redact(s: string): string {
  // Very conservative: mask SSNs/emails/phones by pattern
  return s
    .replace(/\b\d{3}-\d{2}-\d{4}\b/g, "***-**-****")
    .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/ig, "[email]")
    .replace(/\+?\d[\d\s().-]{7,}\d/g, "[phone]");
}
