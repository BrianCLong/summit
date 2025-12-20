import { Section } from "@/components/site/Section";

export default function PrivacyPage() {
  return (
    <Section kicker="Privacy" title="Privacy" subtitle="Data minimization by design: first-party analytics only, no content capture, clear retention controls.">
      <p className="text-sm text-[var(--muted)]">
        We collect only high-level interaction events for live testing. Sensitive content is never captured. Logs are rotated and
        can be piped into a customer-owned sink for review. Contact security@topicality.co for data handling specifics.
      </p>
    </Section>
  );
}
