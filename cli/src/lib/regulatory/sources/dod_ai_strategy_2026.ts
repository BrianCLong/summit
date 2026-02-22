import { createHash } from 'crypto';

const MOCK_DATA = {
  name: "DoD AI Strategy 2026",
  url: "https://media.defense.gov/2026/Jan/12/2003855671/-1/-1/0/ARTIFICIAL-INTELLIGENCE-STRATEGY-FOR-THE-DEPARTMENT-OF-WAR.PDF",
  etag: "mock-etag-dod-2026-02-04",
  lastModified: "2026-01-12T00:00:00Z",
  data: {
    title: "Artificial Intelligence Strategy for the Department of War",
    principles: ["AI-first", "Auditability", "Experimentation"],
    date: "Jan 2026"
  }
};

export async function fetchDodAiStrategy() {
  try {
      const controller = new AbortController();
      const id = setTimeout(() => controller.abort(), 2000);
      // PDF might be binary, text() might mess it up but for hash it's ok-ish or use arrayBuffer
      const response = await fetch(MOCK_DATA.url, { signal: controller.signal });
      clearTimeout(id);

      if (!response.ok) throw new Error(response.statusText);
      const buffer = await response.arrayBuffer();
      const text = new TextDecoder().decode(buffer); // Naive PDF decode

      const etag = response.headers.get('etag') || createHash('sha256').update(new Uint8Array(buffer)).digest('hex').substring(0, 16);
      const lastModified = response.headers.get('last-modified') || new Date().toISOString();

      return {
          name: MOCK_DATA.name,
          url: MOCK_DATA.url,
          etag,
          lastModified,
          data: {
             byteLength: buffer.byteLength
          }
      };
  } catch (e) {
       return MOCK_DATA;
  }
}
