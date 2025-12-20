import type { MetadataRoute } from "next";

const base = process.env.NEXT_PUBLIC_SITE_URL ?? "https://topicality.co";

export default function sitemap(): MetadataRoute.Sitemap {
  const paths = [
    "/",
    "/summit",
    "/summit/pages/capabilities",
    "/summit/pages/architecture",
    "/summit/pages/security",
    "/summit/pages/use-cases",
    "/summit/pages/roadmap",
    "/summit/pages/faq",
    "/initiatives",
    "/labs",
    "/research",
    "/products",
    "/tools",
    "/writing",
    "/about",
    "/careers",
    "/contact",
    "/legal",
    "/privacy",
    "/status"
  ];
  return paths.map((p) => ({ url: `${base}${p}`, lastModified: new Date() }));
}
