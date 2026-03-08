"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.buildMetadata = buildMetadata;
function buildMetadata({ title, description, path }) {
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
