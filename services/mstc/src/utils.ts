export const normalize = (value: string): string =>
  value
    .toLocaleLowerCase()
    .normalize('NFD')
    .replace(/\p{Diacritic}/gu, '')
    .replace(/[^a-z0-9\p{sc=Han}\p{sc=Hiragana}\p{sc=Katakana}\s]/gu, '')
    .replace(/\s+/g, ' ')
    .trim();

export const unique = <T>(values: T[]): T[] => Array.from(new Set(values));

export const sortBy = <T>(items: T[], iteratee: (item: T) => string): T[] =>
  [...items].sort((a, b) => iteratee(a).localeCompare(iteratee(b)));
