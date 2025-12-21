import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Labs',
  description:
    'Research and experimental work at the edge of what we understand about complex systems.',
  path: '/labs',
});

export default function LabsPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Labs"
        subtitle="Research and experimental work at the edge of what we understand about complex systems."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Provenance systems" subtitle="What makes lineage useful?">
          <p className="text-sm text-[var(--muted)]">
            Exploring the design space of provenance: what granularity matters,
            how to surface lineage in UX, and when provenance becomes overhead
            vs value.
          </p>
        </Card>
        <Card title="Governance UX" subtitle="Policy without friction">
          <p className="text-sm text-[var(--muted)]">
            How do you make policy-aware interfaces that feel helpful rather
            than obstructive? What patterns make constraints feel natural?
          </p>
        </Card>
        <Card title="Evaluation discipline" subtitle="Measuring what matters">
          <p className="text-sm text-[var(--muted)]">
            Building evaluation frameworks that capture the qualities we care
            about: trust, accuracy, auditability, and operational clarity.
          </p>
        </Card>
        <Card title="Graph reasoning" subtitle="Structure as intelligence">
          <p className="text-sm text-[var(--muted)]">
            How do graph structures enable reasoning that flat data cannot?
            What patterns emerge when relationships are first-class citizens?
          </p>
        </Card>
      </div>
    </div>
  );
}
