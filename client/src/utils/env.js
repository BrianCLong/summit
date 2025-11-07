export function getImportMetaEnv() {
  try {
    // Accessing import.meta in environments that do not support it throws.
    return import.meta && import.meta.env ? import.meta.env : undefined;
  } catch (error) {
    return undefined;
  }
}

export function getAppEnv() {
  if (typeof globalThis !== 'undefined') {
    const appEnv = globalThis.__APP_ENV__;
    if (appEnv && typeof appEnv === 'object') {
      return appEnv;
    }
  }

  return undefined;
}

export function getEnvVar(key, fallback = '') {
  const metaEnv = getImportMetaEnv();
  if (metaEnv && metaEnv[key] != null) {
    return metaEnv[key];
  }

  if (typeof process !== 'undefined' && process.env && process.env[key] != null) {
    return process.env[key];
  }

  const appEnv = getAppEnv();
  if (appEnv && appEnv[key] != null) {
    return appEnv[key];
  }

  return fallback;
}
