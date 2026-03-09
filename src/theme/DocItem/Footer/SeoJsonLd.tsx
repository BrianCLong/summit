import React from 'react';
import { useDoc } from '@docusaurus/theme-common/internal';
export default function SeoJsonLd() {
  const { metadata } = useDoc();
  const ld = {
    '@context': 'https://schema.org',
    '@type': 'TechArticle',
    headline: metadata.title,
    dateModified: metadata.lastUpdatedAt || new Date().toISOString(),
    author: { '@type': 'Organization', name: 'IntelGraph' },
    breadcrumb: {
      '@type': 'BreadcrumbList',
      itemListElement: (metadata?.frontMatter?.slug || '')
        .split('/')
        .map((p, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: p,
          item: `/${(metadata?.frontMatter?.slug || '')
            .split('/')
            .slice(0, i + 1)
            .join('/')}`,
        })),
    },
  };
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(ld) }}
    />
  );
}
