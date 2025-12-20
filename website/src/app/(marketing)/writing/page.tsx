import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function WritingPage() {
  return (
    <div className="space-y-8">
      <Section kicker="Writing" title="Writing" subtitle="Essays and notes on systems, governance, and operational clarity." />
      <Card title="Publishing cadence" subtitle="Low-noise, high-signal">
        <p className="text-sm text-[var(--muted)]">
          Writing is published when it is ready to influence design or operations. Expect precise language, receipts, and
          evidence rather than marketing filler.
        </p>
      </Card>
    </div>
  );
}
