import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";
import { Table } from "@/components/ui/Table";

export default function Architecture() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Architecture"
        subtitle="A system designed to scale across evidence volume, scrutiny, and organizational complexity—without collapsing into spaghetti."
      />
      <Card title="Key architectural commitments" subtitle="Stable primitives that survive growth">
        <Table
          columns={["Primitive", "Purpose", "Why it matters"]}
          rows={[
            ["Evidence object", "Immutable reference to source artifact", "Enables auditability + reprocessing"],
            ["Transform step", "Explicit mapping from inputs → outputs", "Prevents invisible changes"],
            ["Policy context", "Executable constraints around actions/data", "Makes governance real"],
            ["Narrative overlay", "Human interpretation without mutating facts", "Separates evidence from hypotheses"]
          ]}
        />
      </Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Obvious-to-auditors" subtitle="Designed for review">
          <p className="text-sm text-[var(--muted)]">
            The architecture makes it easy to answer: what happened, who did it, why it was permitted, and what evidence supports
            the current state.
          </p>
        </Card>
        <Card title="Obvious-to-operators" subtitle="Designed for operations">
          <p className="text-sm text-[var(--muted)]">
            Operational workflows are first-class: health endpoints, predictable deployments, measurable behaviors, and a clear
            separation of concerns.
          </p>
        </Card>
      </div>
    </div>
  );
}
