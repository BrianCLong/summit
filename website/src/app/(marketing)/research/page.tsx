import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function ResearchPage() {
  return (
    <div className="space-y-8">
      <Section kicker="Research" title="Research" subtitle="Structured to publish applied research without fragmenting the product narrative." />
      <Card title="Governed intelligence" subtitle="Research tracks">
        <p className="text-sm text-[var(--muted)]">
          Research spans provenance modeling, policy enforcement in ML pipelines, and evaluation frameworks for trustworthy
          automation.
        </p>
      </Card>
    </div>
  );
}
