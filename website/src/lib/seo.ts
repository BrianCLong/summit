import type { Metadata } from "next";

export function buildMetadata({ title, description, path }: { title: string; description: string; path: string }): Metadata {
  const baseUrl = process.env.NEXT_PUBLIC_SITE_URL ?? "https://topicality.co";
  const url = `${baseUrl}${path}`;

  return {
    title,
    description,
    metadataBase: new URL(baseUrl),
    openGraph: {
      title,
      description,
      url,
      siteName: "Topicality",
      type: "website"
    },
    twitter: {
      card: "summary_large_image",
      title,
      description
    },
    alternates: {
      canonical: url
    }
  };
}
