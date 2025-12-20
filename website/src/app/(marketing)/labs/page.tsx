import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function LabsPage() {
  return (
    <div className="space-y-8">
      <Section kicker="Labs" title="Labs" subtitle="Applied research spaces for experimentation without jeopardizing production posture." />
      <Card title="Systems lab" subtitle="Inference + provenance">
        <p className="text-sm text-[var(--muted)]">
          Focused on provenance-aware inference, evaluation harnesses, and policy-aware agents that can be promoted into
          production initiatives.
        </p>
      </Card>
    </div>
  );
}
