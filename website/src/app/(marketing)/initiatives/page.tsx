import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function InitiativesPage() {
  return (
    <div className="space-y-8">
      <Section
        kicker="Topicality"
        title="Initiatives"
        subtitle="Topicality is designed to host a family of initiatives—products, labs, and research—without re-architecting the narrative."
      />
      <Card title="Summit" subtitle="Flagship initiative">
        <p className="text-sm text-[var(--muted)]">
          Summit is the first deep instantiation of the Topicality model: a governed, provenance-forward platform for intelligence
          workflows.
        </p>
      </Card>
    </div>
  );
}
