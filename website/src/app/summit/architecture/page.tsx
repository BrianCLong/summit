import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { Table } from '@/components/ui/Table';
import { summit } from '@/content/summit';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Summit Architecture',
  description:
    'A system designed to scale across evidence volume, scrutiny, and organizational complexity—without collapsing into spaghetti.',
  path: '/summit/architecture',
});

export default function Architecture() {
  const { architecture } = summit;

  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Architecture"
        subtitle="A system designed to scale across evidence volume, scrutiny, and organizational complexity—without collapsing into spaghetti."
      />

      <Card
        title="Key architectural primitives"
        subtitle="Stable primitives that survive growth"
      >
        <Table
          columns={['Primitive', 'Purpose', 'Why it matters']}
          rows={architecture.primitives.map((p) => [
            p.primitive,
            p.purpose,
            p.why,
          ])}
        />
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {architecture.qualities.map((q) => (
          <Card key={q.title} title={q.title} subtitle={q.subtitle}>
            <p className="text-sm text-[var(--muted)]">{q.body}</p>
          </Card>
        ))}
      </div>

      <Section
        kicker="Design principles"
        title="Structural commitments"
        subtitle="The architecture reflects specific choices about how systems should behave."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Immutability at the core" subtitle="Evidence doesn't change">
            <p className="text-sm text-[var(--muted)]">
              Source artifacts and evidence objects are immutable. Changes
              create new versions with explicit lineage to originals.
            </p>
          </Card>
          <Card title="Explicit transforms" subtitle="No invisible changes">
            <p className="text-sm text-[var(--muted)]">
              Every transformation from input to output is recorded with
              enough context to understand and reproduce.
            </p>
          </Card>
          <Card title="Separation of concerns" subtitle="Facts vs interpretations">
            <p className="text-sm text-[var(--muted)]">
              Evidence is separate from narrative overlays. You can have
              competing interpretations without mutating the underlying facts.
            </p>
          </Card>
          <Card title="Policy as code" subtitle="Executable governance">
            <p className="text-sm text-[var(--muted)]">
              Governance rules are expressed in executable form, not just
              documented. Constraints are evaluated, not just hoped for.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
