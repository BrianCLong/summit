export const explainDecisionFixture = {
  __typename: 'DecisionExplanation',
  paragraphId: 'para-17',
  metadata: {
    __typename: 'DecisionExplanationMetadata',
    heading: 'Paragraph 17 determination overview',
    headingCitation: '[Review-Record-2026-17]',
    preparedBy: 'Oversight Review Board Panel B [Oversight-Ledger-2026-PanelB]',
    updatedAt: '2026-03-14T10:45:00Z',
    updatedAtCitation: '[Oversight-Ledger-2026-PanelB-§Timestamp]',
  },
  evidenceSummary: 'Supporting citations originate from the intelligence docket cross-reference maintained in dossier 74-B. [Dossier-74B-Index]',
  dissentSummary: 'Dissent excerpts are sourced from the adjudication transcript recorded on 2026-03-12. [Adj-Transcript-2026-03-12]',
  policySummary: 'Applicable gating authorities reference the policy matrix revision 9 approved by compliance memorandum 2026-02. [Policy-Matrix-Rev9]',
  evidence: [
    {
      __typename: 'DecisionEvidence',
      id: 'ev-1',
      label: 'SIGINT intercept corroborating logistics timeline',
      labelCitation: '[SIGINT-2045-§12]',
      detail:
        'Signals intercept 24-B confirms materiel movement synced with the briefed conclusion, as logged in operational ledger entry 311. [Ops-Ledger-311]',
      provenance:
        'Captured via forward collection node Delta on 2026-02-28 under collection task order 88-G, verified by cryptologic audit trail v5. [Collection-Order-88G]',
      provenanceCitation: '[Crypto-Audit-v5]',
    },
    {
      __typename: 'DecisionEvidence',
      id: 'ev-2',
      label: 'Imagery analysis of convoy dispersal',
      labelCitation: '[IMINT-Convoy-2026-§4]',
      detail:
        'Multi-angle imagery mosaic demonstrates convoy dispersal at 0430Z aligning with the assessed outcome in paragraph 17. [Imagery-Mosaic-2026-0430Z]',
      provenance:
        'Imagery fused from orbital platforms Horizon-3 and Lumen-1, processed through chain-of-custody workflow revision 12. [Chain-Custody-Rev12]',
      provenanceCitation: '[Imagery-Process-Note-12]',
    },
  ],
  dissents: [
    {
      __typename: 'DecisionDissent',
      id: 'di-1',
      author: 'Commissioner L. Ortega',
      authorCitation: '[Ortega-Dissent-2026-§3]',
      excerpt:
        'Ortega contends the convoy dispersal could indicate tactical feints inconsistent with the primary conclusion. [Ortega-Dissent-2026-§4]',
    },
    {
      __typename: 'DecisionDissent',
      id: 'di-2',
      author: 'Analyst L. Banerjee',
      authorCitation: '[Banerjee-Minority-Note-§2]',
      excerpt:
        'Banerjee notes counter-sabotage indicators lacking follow-on validation prior to publication of paragraph 17. [Banerjee-Minority-Note-§4]',
    },
  ],
  policies: [
    {
      __typename: 'DecisionPolicy',
      id: 'po-1',
      title: 'Executive Order 13526 §1.4(c)',
      titleCitation: '[EO13526-§1.4(c)]',
      authority:
        'Classified intelligence assessments subject to executive handling thresholds require restricted dissemination of the cited conclusion. [Handling-Threshold-Guide-2026]',
    },
    {
      __typename: 'DecisionPolicy',
      id: 'po-2',
      title: 'Oversight Compliance Bulletin 22-17',
      titleCitation: '[OCB-22-17]',
      authority:
        'Bulletin 22-17 mandates a secondary legal review before disseminating determinations referencing cross-border operations. [Legal-Review-Addendum-22-17]',
    },
  ],
} as const;

export type ExplainDecisionFixture = typeof explainDecisionFixture;
