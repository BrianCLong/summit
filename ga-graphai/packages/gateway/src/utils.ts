export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}

export function splitParagraphs(text: string): string[] {
  return text
    .split(/\n{2,}/)
    .map((paragraph) => paragraph.trim())
    .filter(Boolean);
}

export function dedupeParagraphs(text: string): string {
  const seen = new Set<string>();
  const paragraphs = splitParagraphs(text);
  const deduped = paragraphs.filter((paragraph) => {
    const normalized = normalizeWhitespace(paragraph.toLowerCase());
    if (seen.has(normalized)) {
      return false;
    }
    seen.add(normalized);
    return true;
  });
  return deduped.join('\n\n');
}

export function detectLanguage(
  text: string,
): 'en' | 'es' | 'fr' | 'de' | 'unknown' {
  const lower = text.toLowerCase();
  if (/¿|¡|ñ/.test(lower)) {
    return 'es';
  }
  if (/[éèàçîôû]/.test(lower)) {
    return 'fr';
  }
  if (/[äöüß]/.test(lower)) {
    return 'de';
  }
  if (/^[\x00-\x7F]*$/.test(text)) {
    return 'en';
  }
  return 'unknown';
}

export function extractKeyValues(text: string): Record<string, string> {
  const map: Record<string, string> = {};
  const regex = /^(?<key>[A-Za-z][A-Za-z0-9 _-]+):\s*(?<value>.+)$/gm;
  let match: RegExpExecArray | null;
  while ((match = regex.exec(text)) !== null) {
    const key = match.groups?.key?.toLowerCase().trim();
    const value = match.groups?.value?.trim();
    if (key && value) {
      map[key] = value;
    }
  }
  return map;
}

export function extractBudgetUSD(text: string): number | undefined {
  const match = text.match(/\$?(\d+(?:\.\d+)?)\s*(?:usd|dollars?)/i);
  if (match) {
    return Number.parseFloat(match[1]);
  }
  return undefined;
}

export function extractLatency(text: string): number | undefined {
  const match = text.match(/p95\s*(\d{2,5})\s*ms/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  return undefined;
}

export function extractContextLimit(text: string): number | undefined {
  const match = text.match(/context\s*[:=]\s*(\d{3,6})\s*tokens/i);
  if (match) {
    return Number.parseInt(match[1], 10);
  }
  return undefined;
}

export function extractEntities(text: string): string[] {
  const matches = text.match(
    /(?:repo|service|component|dataset)[:=]\s*([A-Za-z0-9._\/-]+)/gi,
  );
  if (!matches) {
    return [];
  }
  return matches
    .map((entry) => entry.split(/[:=]/)[1]?.trim())
    .filter((entity): entity is string => Boolean(entity))
    .map((entity) => entity.replace(/,$/, ''));
}

export function findAmbiguousPhrases(text: string): string[] {
  const phrases = ['tbd', 'maybe', 'approximately', 'roughly', 'asap', 'later'];
  const lower = text.toLowerCase();
  return phrases.filter((phrase) => lower.includes(phrase));
}

export function scoreSkillOverlap(skills: string[], tags: string[]): number {
  const normalizedSkills = new Set(skills.map((skill) => skill.toLowerCase()));
  const normalizedTags = new Set(tags.map((tag) => tag.toLowerCase()));
  let overlap = 0;
  normalizedTags.forEach((tag) => {
    if (normalizedSkills.has(tag)) {
      overlap += 1;
    }
  });
  return normalizedSkills.size === 0 ? 0 : overlap / normalizedSkills.size;
}

export function average(numbers: number[]): number {
  if (numbers.length === 0) {
    return 0;
  }
  return numbers.reduce((sum, value) => sum + value, 0) / numbers.length;
}
