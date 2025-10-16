let dict = {};
let current = 'en';

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

export function t(key, vars = {}) {
  const tpl = dict[key] || key;
  return tpl.replace(/\{(\w+)\}/g, (_, k) =>
    k in vars ? String(vars[k]) : `{${k}}`,
  );
}

export function getLanguage() {
  return current;
}
