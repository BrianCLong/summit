import { Section } from "@/components/site/Section";

export default function StatusPage() {
  return (
    <Section kicker="Status" title="Operational status" subtitle="Live testing friendly. Health endpoints and instrumentation are present from day one.">
      <p className="text-sm text-[var(--muted)]">
        Uptime checks are exposed via /api/health. Analytics ingestion is logged server-side for review. Future incidents and
        maintenance windows will be published here.
      </p>
    </Section>
  );
}
