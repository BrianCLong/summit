import { PromptCase } from './types.js';

const splitCsvLine = (line: string): string[] => {
  const values: string[] = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i += 1) {
    const char = line[i];
    if (char === '"') {
      const nextChar = line[i + 1];
      if (inQuotes && nextChar === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values.map((value) => value.trim());
};

export const parsePromptsCsv = (csv: string): PromptCase[] => {
  const lines = csv
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
  if (lines.length === 0) {
    return [];
  }
  const header = splitCsvLine(lines[0]);
  const idIndex = header.indexOf('id');
  const promptIndex = header.indexOf('prompt');
  const expectedIndex = header.indexOf('expected_trigger');
  const tagsIndex = header.indexOf('tags');

  return lines.slice(1).map((line) => {
    const values = splitCsvLine(line);
    const id = values[idIndex] ?? '';
    const prompt = values[promptIndex] ?? '';
    const expectedRaw = values[expectedIndex] ?? 'false';
    const tagsRaw = values[tagsIndex] ?? '';
    return {
      id,
      prompt,
      expected_trigger: expectedRaw.toLowerCase() === 'true',
      tags: tagsRaw
        .split('|')
        .map((tag) => tag.trim())
        .filter((tag) => tag.length > 0),
    };
  });
};
