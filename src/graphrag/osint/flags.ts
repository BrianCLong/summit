export const OSINT_FLAGS = {
  OSINT_ENRICHMENT_ENABLED: process.env.OSINT_ENRICHMENT_ENABLED === 'true',
  OSINT_GAI_ENABLED: process.env.OSINT_GAI_ENABLED === 'true'
};

export function isEnrichmentEnabled(): boolean {
  return OSINT_FLAGS.OSINT_ENRICHMENT_ENABLED;
}

export function isGAIEnabled(): boolean {
  return OSINT_FLAGS.OSINT_GAI_ENABLED;
}
