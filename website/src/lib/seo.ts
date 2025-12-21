import type { Metadata } from 'next';
import { env } from './env';

interface SeoParams {
  title: string;
  description: string;
  path: string;
  image?: string;
  noIndex?: boolean;
}

/**
 * Build metadata for a page
 */
export function buildMetadata(params: SeoParams): Metadata {
  const { title, description, path, image, noIndex } = params;
  const url = `${env.siteUrl}${path}`;
  const siteName = 'Topicality';
  const fullTitle = path === '/' ? title : `${title} | ${siteName}`;

  return {
    title: fullTitle,
    description,
    metadataBase: new URL(env.siteUrl),
    alternates: {
      canonical: url,
    },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName,
      type: 'website',
      images: image
        ? [
            {
              url: image,
              width: 1200,
              height: 630,
              alt: title,
            },
          ]
        : undefined,
    },
    twitter: {
      card: 'summary_large_image',
      title: fullTitle,
      description,
      images: image ? [image] : undefined,
    },
    robots: noIndex
      ? { index: false, follow: false }
      : { index: true, follow: true },
  };
}

/**
 * Default metadata for the site
 */
export const defaultMetadata: Metadata = {
  title: {
    default: 'Topicality',
    template: '%s | Topicality',
  },
  description:
    'Topicality builds, studies, and deploys complex systems—products, research, and initiatives designed for trust, clarity, and iteration.',
  metadataBase: new URL(env.siteUrl),
  icons: {
    icon: '/favicon.ico',
  },
};
