import { SourceSpec } from './types';

export const PLATFORM_SOURCES: SourceSpec[] = [
  {
    id: 'maltego-evidence-docs',
    platform: 'maltego',
    name: 'Introduction to Maltego Evidence',
    url: 'https://support.maltego.com/support/solutions/articles/15000058628-introduction-to-maltego-evidence',
    rationale: 'Official Maltego documentation describing Evidence product surface area.',
  },
  {
    id: 'maltego-monitor-release-notes',
    platform: 'maltego',
    name: 'Release Notes for Maltego Monitor',
    url: 'https://support.maltego.com/support/solutions/articles/15000058936-release-notes-for-maltego-monitor',
    rationale: 'Official Maltego release notes stream for Monitor module.',
  },
  {
    id: 'shadowdragon-horizon-identity',
    platform: 'shadowdragon',
    name: 'Introducing Horizon Identity',
    url: 'https://shadowdragon.io/blog/shadowdragon-introduces-horizon-identity/',
    rationale: 'Official ShadowDragon blog announcement for Horizon Identity.',
  },
  {
    id: 'i2-analysts-notebook-release-materials',
    platform: 'i2',
    name: "IBM i2 Analyst's Notebook Release Materials",
    url: 'https://docs.i2group.com/release-material/as/2025.10/i2-as-2025.10.html',
    rationale: 'Official i2 release materials for Analyst’s Notebook family.',
  },
  {
    id: '1trace-home',
    platform: '1trace',
    name: '1TRACE Product Home',
    url: 'https://1trace.io/',
    rationale: 'Official 1TRACE product homepage as minimal source of record.',
  },
];

export const ALLOWED_URL_PREFIXES = PLATFORM_SOURCES.map((source) => {
  const normalized = normalizeSourceUrl(source.url);
  const url = new URL(normalized);
  const basePath = url.pathname.endsWith('/')
    ? url.pathname
    : url.pathname.replace(/\/[^/]+$/, '/') || '/';
  return `${url.origin}${basePath}`;
});

export function normalizeSourceUrl(value: string): string {
  const url = new URL(value);
  url.search = '';
  url.hash = '';
  return url.toString();
}
