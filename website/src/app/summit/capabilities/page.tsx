import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { CodeBlock } from '@/components/ui/CodeBlock';
import { summit } from '@/content/summit';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Summit Capabilities',
  description:
    'A practical surface area: ingest, graph, governance, provenance, analysis, prediction—each designed to operate under scrutiny.',
  path: '/summit/capabilities',
});

export default function Capabilities() {
  const { capabilities } = summit;

  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Capabilities"
        subtitle="A practical surface area: ingest, graph, governance, provenance, analysis, prediction—each designed to operate under scrutiny."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card
          title={capabilities.evidence.title}
          subtitle={capabilities.evidence.subtitle}
        >
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {capabilities.evidence.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card
          title={capabilities.graph.title}
          subtitle={capabilities.graph.subtitle}
        >
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {capabilities.graph.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card
          title={capabilities.governance.title}
          subtitle={capabilities.governance.subtitle}
        >
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {capabilities.governance.items.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </Card>

        <Card
          title={capabilities.provenance.title}
          subtitle={capabilities.provenance.subtitle}
        >
          <p className="text-sm text-[var(--muted)]">
            {capabilities.provenance.description}
          </p>
          <CodeBlock code={capabilities.provenance.schema} />
        </Card>
      </div>

      <Section
        kicker="Integration"
        title="End-to-end workflow"
        subtitle="Summit capabilities work together as a coherent system, not as isolated features."
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Ingest" subtitle="Bring evidence in">
            <p className="text-sm text-[var(--muted)]">
              Evidence enters the system with provenance attached from the
              start. Original artifacts are preserved alongside normalized
              representations.
            </p>
          </Card>
          <Card title="Analyze" subtitle="Build understanding">
            <p className="text-sm text-[var(--muted)]">
              Graph-based analysis enables relationship discovery while
              maintaining lineage. Hypotheses are overlays, not mutations.
            </p>
          </Card>
          <Card title="Govern" subtitle="Enforce policy">
            <p className="text-sm text-[var(--muted)]">
              Policy constraints are evaluated continuously. Decisions are
              logged with context for later audit.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
