/**
 * Route utilities
 */

/**
 * Check if a path is internal (starts with / but not //)
 */
export function isInternalPath(href: string): boolean {
  return href.startsWith('/') && !href.startsWith('//');
}

/**
 * Check if a URL is external
 */
export function isExternalUrl(url: string): boolean {
  return url.startsWith('http://') || url.startsWith('https://') || url.startsWith('//');
}

/**
 * Get the base path for the current environment
 */
export function getBasePath(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? '';
}
