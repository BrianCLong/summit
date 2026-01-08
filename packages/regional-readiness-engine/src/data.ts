import {
  Checklist,
  ControlMapping,
  RegionCriteria,
  RegionId,
  RegulatoryRequirement,
  SubprocessorEntry,
} from "./types.js";

export const regionCriteria: RegionCriteria[] = [
  {
    regionId: "united-states",
    go: ["SOC2 + ISO27001 active", "Data residency optional", "Export screening live"],
    hold: [
      "Pending state-level privacy addenda (e.g., CCPA updates)",
      "Partial subprocessor coverage",
    ],
    noGo: ["No screening or acceptable-use controls", "Unresolved law-enforcement data handling"],
  },
  {
    regionId: "european-union-germany",
    go: [
      "GDPR Article 28 DPA + SCCs in place",
      "EU data stored in-region with KMS per-region",
      "Schrems II transfer assessment logged",
    ],
    hold: [
      "Residency controls live but egress allowlists incomplete",
      "Works council consultations pending",
    ],
    noGo: [
      "No legal basis for processing",
      "Cross-region helper services still active",
      "Missing DSAR automation",
    ],
  },
  {
    regionId: "singapore",
    go: ["PDPA-compliant notices", "SG KMS keys", "MAS TRM alignment for financial vertical"],
    hold: [
      "MAS addenda in negotiation",
      "Regional backups unverified",
      "Partner screening lagging",
    ],
    noGo: [
      "Data exits SG region without allowlist",
      "Missing financial-sector clauses for regulated customers",
    ],
  },
];

const regulatoryTable: Array<[RegulatoryRequirement["domain"], Record<RegionId, string>, string]> =
  [
    [
      "privacy",
      {
        "united-states": "State privacy (CCPA/CPRA)",
        "european-union-germany": "GDPR (DPA, SCCs, RoPA, DPIA)",
        singapore: "PDPA",
      },
      "Policy engine enforcing residency (Platform Eng), Records of Processing (Legal)",
    ],
    [
      "consumer",
      {
        "united-states": "FTC unfair/deceptive",
        "european-union-germany": "EU consumer protection",
        singapore: "PDPA consent/withdrawal",
      },
      "Consent + notice services (Product), audit logging (Security)",
    ],
    [
      "sector",
      {
        "united-states": "CJIS/FIN optional",
        "european-union-germany": "NIS2/finance riders",
        singapore: "MAS TRM for finance",
      },
      "Sector feature flags + riders (Legal), regulated feature gating (Platform)",
    ],
    [
      "labor",
      {
        "united-states": "Support staff monitoring/works councils",
        "european-union-germany": "Works council consultation for monitoring",
        singapore: "Employee monitoring notification",
      },
      "HR process for monitoring approvals (HR), access justifications (Security)",
    ],
    [
      "tax",
      {
        "united-states": "Nexus + sales tax",
        "european-union-germany": "VAT + invoice formats",
        singapore: "GST",
      },
      "Regional invoicing templates (Finance), tax engine config (RevOps)",
    ],
  ];

export const regulatoryRequirements: RegulatoryRequirement[] = regulatoryTable.flatMap(
  ([domain, regionMap, controlOwner]) =>
    (Object.entries(regionMap) as Array<[RegionId, string]>).map(([regionId, requirement]) => ({
      domain,
      regionId,
      requirement,
      controlOwner,
    }))
);

export const controlMappings: ControlMapping[] = [
  {
    name: "Residency enforcement",
    description:
      "Tenant home region, default-deny policy engine for cross-region calls, regional KMS keys, backups/restores validated in-region",
    owners: ["Platform Eng"],
    epics: ["Data Residency Platform", "Regional Reliability & Performance"],
  },
  {
    name: "Export controls & sanctions",
    description:
      "Onboarding screening with re-screen cadence, geo/IP risk scoring, restricted-party escalation, stop-service playbook",
    owners: ["Legal", "Security"],
    epics: ["Export Controls & Sanctions Guardrails"],
  },
  {
    name: "Procurement",
    description:
      "Standard packets (security/privacy/reliability), regional DPAs/SCCs, uptime/support SLAs aligned to real ops, contract metadata tracked",
    owners: ["Legal", "RevOps"],
    epics: ["Regional Procurement Engine"],
  },
  {
    name: "Localization",
    description:
      "i18n pipeline, locale formats, time zone correctness, country feature flags for regulatory differences, glossary and fallbacks",
    owners: ["Product", "Engineering"],
    epics: ["Localization & Language Ops"],
  },
  {
    name: "Reliability & performance",
    description:
      "RUM by region, CDN/edge caching, regional caches, load tests and SLO dashboards per region, dependency availability plans",
    owners: ["SRE"],
    epics: ["Regional Reliability & Performance"],
  },
  {
    name: "Operations & support",
    description:
      "Follow-the-sun coverage, routing by region/language/severity, region-aware comms, runbooks with addenda, proactive alerts",
    owners: ["Support", "SRE"],
    epics: ["Regional Operations & Support"],
  },
];

export const localizationChecklist: Checklist = {
  category: "Localization",
  items: [
    "Language coverage: EN, DE, FR, ES, JA, ZH-SG; glossary maintained",
    "Locale formatting: dates, numbers, currency, address formats",
    "Time zone correctness: storage → API → UI → exports",
    "Templates: onboarding, email, invoice, legal notices localized",
    "Fallback behavior: missing strings fall back to English with telemetry",
  ],
};

export const procurementChecklist: Checklist = {
  category: "Procurement",
  items: [
    "Security/privacy packet, uptime/support commitments, reliability architecture",
    "DPAs/SCCs and data transfer addenda; sector riders where required",
    "Tax/VAT/GST invoicing readiness; evidence of filings as applicable",
    "Standard artifacts: pen test letter, vuln management cadence, business continuity/DR, evidence pack",
    "Fast lane vs slow lane criteria with SLAs for legal/security review",
  ],
};

export const subprocessorAvailability: SubprocessorEntry[] = [
  {
    name: "global-messaging",
    approvedRegions: ["united-states", "european-union-germany"],
    dataClasses: ["communication-metadata"],
    evidenceUrl: "https://example.com/subprocessors/global-messaging",
  },
  {
    name: "sg-audit-storage",
    approvedRegions: ["singapore"],
    dataClasses: ["audit-logs", "pii"],
    evidenceUrl: "https://example.com/subprocessors/sg-audit-storage",
  },
];

export const supportModel: Checklist = {
  category: "Regional support model",
  items: [
    "Support hours and SLAs per tier/region with escalation matrix covering Legal/Security/Engineering",
    "Routing by region/language/severity/tier; multilingual diagnostics and in-app repair actions",
    "Proactive alerts for regional dependency outages; regional evidence packs for audits",
  ],
};

export const launchGateControls: string[] = [
  "Residency enforcement validated (storage, backups, keys, egress allowlists)",
  "Screening/export controls live with audit trails and exception registry",
  "Procurement packet complete; contract riders and tax readiness verified",
  "Localization smoke: key journeys screenshot-tested in major locales",
  "Reliability: regional SLO dashboards, load-test results, failover posture decisions logged",
  "Operations: runbooks with regional addenda, incident comms templates, support routing tested",
];

export const tabletopScenarios: string[] = [
  "Regulator inquiry: privacy/export controls documentation and evidence pack produced within SLA",
  "Outage: region-aware incident comms, status updates, failover posture executed",
  "DSAR: intake → verification → retrieval → redaction → delivery within local timelines",
];

export const nonNegotiables = [
  "No bespoke forks or country-only code branches; everything behind configuration/feature flags",
  "No ungoverned cross-region helper services or shared caches",
  "No promises of residency or SLAs without validated controls",
  "No bespoke partner builds; partners must use standard platform primitives",
];

export const forwardLookingEnhancements = [
  "Evidence-as-code: automate residency and screening evidence exports via policy engine events",
  "Regional digital twins: simulate failover vs residency tradeoffs to pre-approve patterns",
  "Automated screening quality loop: quarterly false-negative audit feeding model retraining and rule updates",
];
