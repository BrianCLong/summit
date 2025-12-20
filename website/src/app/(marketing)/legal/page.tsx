import { Section } from "@/components/site/Section";

export default function LegalPage() {
  return (
    <Section kicker="Legal" title="Legal" subtitle="Governed by clarity: plain-language terms, provenance-aware data handling, and security-forward defaults.">
      <p className="text-sm text-[var(--muted)]">
        Topicality products, including Summit, operate with provenance and auditability as first-class principles. Formal terms
        and data processing agreements are available upon request for prospective partners and customers.
      </p>
    </Section>
  );
}
