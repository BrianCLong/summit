import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { summit } from '@/content/summit';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Summit FAQ',
  description: 'Frequently asked questions about Summit.',
  path: '/summit/faq',
});

export default function FAQ() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="FAQ"
        subtitle="Direct answers, minimal marketing noise."
      />

      <div className="space-y-4">
        {summit.faqs.map((f) => (
          <Card key={f.q} title={f.q} subtitle="">
            <p className="text-sm text-[var(--muted)]">{f.a}</p>
          </Card>
        ))}
      </div>

      <Section kicker="Technical" title="Common technical questions">
        <div className="space-y-4">
          <Card title="What databases does Summit use?" subtitle="">
            <p className="text-sm text-[var(--muted)]">
              Summit uses Neo4j for graph storage and relationships, PostgreSQL
              for structured metadata and audit logs, and Redis for caching and
              real-time operations. The architecture is designed for
              multi-database coherence.
            </p>
          </Card>
          <Card title="How is Summit deployed?" subtitle="">
            <p className="text-sm text-[var(--muted)]">
              Summit is containerized and deployable on Kubernetes. Helm charts
              and Terraform configurations are provided. The system is designed
              for air-gapped environments when required.
            </p>
          </Card>
          <Card title="What about scalability?" subtitle="">
            <p className="text-sm text-[var(--muted)]">
              Summit is designed to scale horizontally across most components.
              Graph operations can be parallelized, and the architecture
              separates concerns to allow independent scaling of ingest,
              analysis, and serving layers.
            </p>
          </Card>
          <Card title="How do you handle sensitive data?" subtitle="">
            <p className="text-sm text-[var(--muted)]">
              Data classification is a first-class concept. Policy labels can
              be applied to entities and relationships. Access controls are
              enforced at multiple layers. Audit trails capture all access
              to classified data.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
