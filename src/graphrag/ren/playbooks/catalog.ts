export const PLAYBOOK_TEMPLATES = {
  'supply_chain_redaction': {
    title: 'Supply Chain Confidentiality Protection',
    description: 'Guidelines for redaction of supplier names and volumes in public filings.',
    rules: [
      'Redact supplier names under Exemption 4',
      'Aggregate volume data',
      'Use generic terms for components'
    ]
  },
  'environmental_filing_min': {
    title: 'Environmental Filing Minimization',
    description: 'Ensure environmental filings do not reveal sensitive operational parameters.',
    rules: [
      'Disclose only required chemical data',
      'Avoid facility layout descriptions',
      'Cross-reference existing protected filings'
    ]
  }
};
