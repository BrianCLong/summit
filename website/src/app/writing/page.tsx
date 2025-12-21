import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Writing',
  description:
    'Essays, technical notes, and reflections on building complex systems.',
  path: '/writing',
});

export default function WritingPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Writing"
        subtitle="Essays, technical notes, and reflections on building complex systems."
      />

      <div className="space-y-4">
        <Card title="On provenance" subtitle="Why lineage matters">
          <p className="text-sm text-[var(--muted)]">
            Provenance is often treated as a compliance requirement—something
            you add at the end. But lineage is more powerful as a design
            primitive: a way of structuring systems so that questions about
            "what happened" have clear answers.
          </p>
        </Card>
        <Card title="Trust as interface" subtitle="Making the invisible visible">
          <p className="text-sm text-[var(--muted)]">
            Trust in systems is usually implicit—users either trust or they
            don't, and the system provides no help. But trust can be made
            explicit: surfaced, explained, and earned through transparent
            behavior.
          </p>
        </Card>
        <Card title="Governance without friction" subtitle="Policy as enabler">
          <p className="text-sm text-[var(--muted)]">
            Governance is often positioned as overhead—something that slows you
            down. But well-designed governance can be an enabler: making it
            safe to move fast because constraints are enforced automatically.
          </p>
        </Card>
      </div>
    </div>
  );
}
