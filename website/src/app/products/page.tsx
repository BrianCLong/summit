import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Products',
  description:
    'Production-grade systems that emerge from our initiatives and research.',
  path: '/products',
});

export default function ProductsPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Products"
        subtitle="Production-grade systems that emerge from our initiatives and research."
      />

      <Card title="Summit" subtitle="Intelligence workflow platform">
        <p className="text-sm text-[var(--muted)]">
          A platform for intelligence workflows that can be audited, governed,
          and improved. Summit brings together graph analytics, provenance
          tracking, and policy enforcement.
        </p>
        <div className="pt-4">
          <Button href="/summit">Learn more &rarr;</Button>
        </div>
      </Card>

      <Section
        kicker="Philosophy"
        title="Product principles"
        subtitle="What defines a Topicality product"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Operationally obvious" subtitle="Run it, don't just demo it">
            <p className="text-sm text-[var(--muted)]">
              Products are designed to operate: health endpoints, predictable
              deployments, observable behaviors.
            </p>
          </Card>
          <Card title="Trust as surface" subtitle="Not a checkbox">
            <p className="text-sm text-[var(--muted)]">
              Trust surfaces—provenance, policy, audit—are product features,
              not compliance appendices.
            </p>
          </Card>
          <Card title="Iteration-native" subtitle="Built to evolve">
            <p className="text-sm text-[var(--muted)]">
              Products are instrumented to learn and designed to change without
              breaking.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
