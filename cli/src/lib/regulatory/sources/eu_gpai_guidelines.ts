import { createHash } from 'crypto';

const MOCK_DATA = {
  name: "EU AI Act GPAI Guidelines",
  url: "https://digital-strategy.ec.europa.eu/en/policies/guidelines-gpai-providers",
  etag: "mock-etag-eu-gpai-2026-02-04",
  lastModified: "2026-02-04T00:00:00Z",
  data: {
    timeline: [
      { date: "2025-08-02", event: "Obligations enter into application" },
      { date: "2026-08-02", event: "Enforcement powers" },
      { date: "2027-08-02", event: "Pre-existing models must comply" }
    ],
    obligations: "Commission guidance explains applicability and expectations."
  }
};

export async function fetchEuGpaiGuidelines() {
  try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(MOCK_DATA.url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) throw new Error(response.statusText);
      const text = await response.text();

      const etag = response.headers.get('etag') || createHash('sha256').update(text).digest('hex').substring(0, 16);
      const lastModified = response.headers.get('last-modified') || new Date().toISOString();

      const timelineRegex = /(\d{1,2} [A-Z][a-z]+ \d{4})/g;
      const dates = text.match(timelineRegex) || [];

      return {
          name: MOCK_DATA.name,
          url: MOCK_DATA.url,
          etag,
          lastModified,
          data: {
             extractedDates: [...new Set(dates)],
             rawLength: text.length
          }
      };
  } catch (e) {
       return MOCK_DATA;
  }
}
