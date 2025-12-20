let dict = {};
let current = 'en';

/**
 * Loads a language file and sets the current language.
 *
 * @param lang - The language code to load (e.g., 'en', 'fr').
 * @returns A promise that resolves to true if successful, false otherwise.
 */
export async function loadLanguage(lang) {
  try {
    const mod = await import(/* @vite-ignore */ `../locales/${lang}.json`);
    dict = mod.default || mod;
    current = lang;
    if (typeof document !== 'undefined') {
      document.documentElement.lang = lang;
    }
    return true;
  } catch (e) {
    console.warn('Failed to load language', lang, e);
    return false;
  }
}

/**
 * Translates a key using the currently loaded dictionary.
 * Supports variable interpolation using `{varName}` syntax.
 *
 * @param key - The translation key.
 * @param vars - An object containing variables for interpolation.
 * @returns The translated string.
 */
export function t(key, vars = {}) {
  const tpl = dict[key] || key;
  return tpl.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

/**
 * Gets the current language code.
 *
 * @returns The current language code.
 */
export function getLanguage() {
  return current;
}
