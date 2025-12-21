import type { MetadataRoute } from 'next';
import { env } from '@/lib/env';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = env.siteUrl;

  const paths = [
    '/',
    '/summit',
    '/summit/capabilities',
    '/summit/architecture',
    '/summit/security',
    '/summit/use-cases',
    '/summit/roadmap',
    '/summit/faq',
    '/initiatives',
    '/labs',
    '/research',
    '/products',
    '/tools',
    '/writing',
    '/about',
    '/careers',
    '/contact',
    '/legal',
    '/privacy',
    '/status',
  ];

  return paths.map((p) => ({
    url: `${base}${p}`,
    lastModified: new Date(),
    changeFrequency: 'weekly' as const,
    priority: p === '/' ? 1 : p.startsWith('/summit') ? 0.9 : 0.7,
  }));
}
