import { enUS, type TranslationKey } from './en-US';

type TemplateValues = Record<string, string | number>;

const locale = enUS;

function interpolate(template: string, values?: TemplateValues) {
  if (!values) return template;

  return Object.keys(values).reduce((result, key) => {
    const value = values[key];
    return result.replaceAll(`{{${key}}}`, String(value));
  }, template);
}

export function t(key: TranslationKey, values?: TemplateValues): string {
  const phrase = locale[key];
  if (!phrase) {
    return key;
  }

  return interpolate(phrase, values);
}

export type { TranslationKey };
export const translations = { 'en-US': locale } as const;
