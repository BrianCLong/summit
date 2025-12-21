import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { summit } from '@/content/summit';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Summit Roadmap',
  description:
    'A disciplined roadmap: deepen trust surfaces, expand capabilities, keep the architecture legible.',
  path: '/summit/roadmap',
});

export default function Roadmap() {
  const { roadmap } = summit;

  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Roadmap"
        subtitle="A disciplined roadmap: deepen trust surfaces, expand capabilities, keep the architecture legible."
      />

      <div className="grid gap-4 md:grid-cols-3">
        <Card title={roadmap.now.title} subtitle={roadmap.now.subtitle}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {roadmap.now.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title={roadmap.next.title} subtitle={roadmap.next.subtitle}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {roadmap.next.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
        <Card title={roadmap.later.title} subtitle={roadmap.later.subtitle}>
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {roadmap.later.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>
      </div>

      <Section
        kicker="Principles"
        title="Roadmap discipline"
        subtitle="How we think about prioritization and evolution"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Trust first" subtitle="Deepen before expanding">
            <p className="text-sm text-[var(--muted)]">
              Trust surfaces are deepened before adding new capabilities.
              A smaller system with strong trust is more valuable than a
              larger system with weak trust.
            </p>
          </Card>
          <Card title="Legibility" subtitle="Keep the architecture obvious">
            <p className="text-sm text-[var(--muted)]">
              New capabilities should fit naturally into the existing
              architecture. If they don&apos;t, we reconsider either the
              capability or the architecture.
            </p>
          </Card>
          <Card title="Evaluation-driven" subtitle="Measure before celebrating">
            <p className="text-sm text-[var(--muted)]">
              Features ship with evaluation criteria. Success is measured,
              not assumed. We iterate based on evidence.
            </p>
          </Card>
          <Card title="Operational reality" subtitle="It must run">
            <p className="text-sm text-[var(--muted)]">
              Features must be operationally viable: monitorable, debuggable,
              and recoverable. Demo-ware is not on the roadmap.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
