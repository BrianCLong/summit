import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { summit } from '@/content/summit';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Summit Use Cases',
  description:
    'Realistic end-to-end narratives—evidence in, decisions out, with receipts.',
  path: '/summit/use-cases',
});

export default function UseCases() {
  const { useCases } = summit;

  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Use Cases"
        subtitle="Realistic end-to-end narratives—evidence in, decisions out, with receipts."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {useCases.map((uc) => (
          <Card key={uc.title} title={uc.title} subtitle={uc.subtitle}>
            <p className="text-sm text-[var(--muted)]">{uc.body}</p>
          </Card>
        ))}
      </div>

      <Section
        kicker="Scenarios"
        title="Deep dive: Intelligence workflow"
        subtitle="A detailed walkthrough of a typical analysis workflow"
      >
        <div className="space-y-4">
          <Card title="1. Evidence ingest" subtitle="Data enters the system">
            <p className="text-sm text-[var(--muted)]">
              Artifacts from multiple sources are ingested with provenance
              attached. Original files are preserved. Metadata is extracted and
              normalized. Entity candidates are identified for resolution.
            </p>
          </Card>
          <Card title="2. Entity resolution" subtitle="Building the graph">
            <p className="text-sm text-[var(--muted)]">
              Entity candidates are resolved against existing entities in the
              graph. Matches are recorded with confidence scores. Ambiguous
              cases are flagged for human review. Relationships are inferred
              from co-occurrence and explicit links.
            </p>
          </Card>
          <Card title="3. Hypothesis building" subtitle="Overlaying interpretation">
            <p className="text-sm text-[var(--muted)]">
              Analysts create narrative overlays that reference evidence objects.
              Competing hypotheses can coexist without mutating underlying data.
              Each hypothesis is traceable to supporting evidence.
            </p>
          </Card>
          <Card title="4. Policy review" subtitle="Governance in action">
            <p className="text-sm text-[var(--muted)]">
              Sensitive conclusions trigger policy gates. Review workflows
              ensure human oversight for high-impact decisions. All decisions
              are logged with context for later audit.
            </p>
          </Card>
          <Card title="5. Output generation" subtitle="Producing deliverables">
            <p className="text-sm text-[var(--muted)]">
              Reports and exports are generated with full provenance. Recipients
              can trace any claim back to supporting evidence. Change history
              is preserved for version comparison.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
