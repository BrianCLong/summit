import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";

export default function Security() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Security & Governance"
        subtitle="Security is not a checklist; it is a set of product constraints that shape what users can do, what the system will allow, and what can be proven later."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Least privilege by default" subtitle="Authorization shapes the UI">
          <p className="text-sm text-[var(--muted)]">
            Interfaces are policy-aware and never imply actions or access that aren’t permitted. The product surface matches the
            enforcement surface.
          </p>
        </Card>
        <Card title="Auditability" subtitle="Explain the action, not just the outcome">
          <p className="text-sm text-[var(--muted)]">
            Summit emphasizes decision logs, policy contexts, and provenance trails so reviewers can understand why something was
            allowed.
          </p>
        </Card>
      </div>
    </div>
  );
}
