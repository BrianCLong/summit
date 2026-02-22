import { createHash } from 'crypto';

const MOCK_DATA = {
  name: "FedRAMP 20x KSI Phase 2",
  url: "https://fedramp.gov/docs/20x/key-security-indicators/",
  etag: "mock-etag-fedramp-2026-02-04",
  lastModified: "2026-02-04T00:00:00Z",
  data: {
    phase2_counts: { low: 56, moderate: 61 },
    themes: ["KSI-AFR"],
    requirements: "MUST/SHOULD recommendations"
  }
};

export async function fetchFedramp20xKsis() {
  try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      const response = await fetch(MOCK_DATA.url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) throw new Error(response.statusText);
      const text = await response.text();

      const etag = response.headers.get('etag') || createHash('sha256').update(text).digest('hex').substring(0, 16);
      const lastModified = response.headers.get('last-modified') || new Date().toISOString();

      return {
          name: MOCK_DATA.name,
          url: MOCK_DATA.url,
          etag,
          lastModified,
          data: {
             rawLength: text.length
          }
      };
  } catch (e) {
       return MOCK_DATA;
  }
}
