import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Initiatives',
  description:
    'Topicality hosts a family of initiatives—products, labs, and research—without re-architecting the narrative.',
  path: '/initiatives',
});

export default function InitiativesPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Initiatives"
        subtitle="Topicality is designed to host a family of initiatives—products, labs, and research—without re-architecting the narrative."
      />

      <Card title="Summit" subtitle="Flagship initiative">
        <p className="text-sm text-[var(--muted)]">
          Summit is the first deep instantiation of the Topicality model: a
          governed, provenance-forward platform for intelligence workflows.
        </p>
        <div className="pt-4">
          <Button href="/summit">Explore Summit &rarr;</Button>
        </div>
      </Card>

      <Section
        kicker="Architecture"
        title="Why initiatives?"
        subtitle="A portfolio structure enables exploration without over-commitment, and depth without tunnel vision."
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Exploration" subtitle="Test ideas at full fidelity">
            <p className="text-sm text-[var(--muted)]">
              Each initiative can be pursued with rigor without betting the
              entire organization on a single outcome.
            </p>
          </Card>
          <Card title="Coherence" subtitle="Shared foundations, distinct surfaces">
            <p className="text-sm text-[var(--muted)]">
              Initiatives share infrastructure, principles, and operational
              discipline while maintaining distinct product surfaces.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
