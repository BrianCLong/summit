import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function ToolsPage() {
  return (
    <div className="space-y-8">
      <Section kicker="Tools" title="Tools" subtitle="Utilities and interfaces that extend initiatives without creating shadow systems." />
      <Card title="First-party analytics" subtitle="Instrumentation that respects privacy">
        <p className="text-sm text-[var(--muted)]">
          Client events route through a first-party collector with safe properties. Additional destinations can be added without
          changing the client contract.
        </p>
      </Card>
    </div>
  );
}
