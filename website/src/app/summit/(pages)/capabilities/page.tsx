import { Section } from "@/components/site/Section";
import { Card } from "@/components/ui/Card";
import { CodeBlock } from "@/components/ui/CodeBlock";

export default function Capabilities() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Capabilities"
        subtitle="A practical surface area: ingest, graph, governance, provenance, analysis, prediction—each designed to operate under scrutiny."
      />
      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Evidence ingest" subtitle="Bring data in without losing meaning">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Structured and semi-structured sources</li>
            <li>Normalization + entity resolution boundaries</li>
            <li>Retention of original artifacts and transforms</li>
          </ul>
        </Card>
        <Card title="Graph intelligence" subtitle="Relationships as the primary model">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Typed nodes/edges and ontology discipline</li>
            <li>Hypothesis overlays and competing narratives</li>
            <li>Explainable queries and evidence trails</li>
          </ul>
        </Card>
        <Card title="Governance & policy" subtitle="Rules that execute">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Policy gating for sensitive actions</li>
            <li>Change control and review workflows</li>
            <li>Audit-friendly decision logs</li>
          </ul>
        </Card>
        <Card title="Provenance" subtitle="Everything has receipts">
          <p className="text-sm text-[var(--muted)]">
            Provenance is a product surface: not a compliance appendix. Lineage is queryable and can be surfaced per object,
            transform, and analysis step.
          </p>
          <CodeBlock code={`Provenance = { who, what, when, why, inputs[], outputs[], policy_context }`} />
        </Card>
      </div>
    </div>
  );
}
