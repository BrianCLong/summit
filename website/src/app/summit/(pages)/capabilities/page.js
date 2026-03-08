"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Capabilities;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
const CodeBlock_1 = require("@/components/ui/CodeBlock");
function Capabilities() {
    return (<div className="space-y-10">
      <Section_1.Section kicker="Summit" title="Capabilities" subtitle="A practical surface area: ingest, graph, governance, provenance, analysis, prediction—each designed to operate under scrutiny."/>
      <div className="grid gap-4 md:grid-cols-2">
        <Card_1.Card title="Evidence ingest" subtitle="Bring data in without losing meaning">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Structured and semi-structured sources</li>
            <li>Normalization + entity resolution boundaries</li>
            <li>Retention of original artifacts and transforms</li>
          </ul>
        </Card_1.Card>
        <Card_1.Card title="Graph intelligence" subtitle="Relationships as the primary model">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Typed nodes/edges and ontology discipline</li>
            <li>Hypothesis overlays and competing narratives</li>
            <li>Explainable queries and evidence trails</li>
          </ul>
        </Card_1.Card>
        <Card_1.Card title="Governance & policy" subtitle="Rules that execute">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Policy gating for sensitive actions</li>
            <li>Change control and review workflows</li>
            <li>Audit-friendly decision logs</li>
          </ul>
        </Card_1.Card>
        <Card_1.Card title="Provenance" subtitle="Everything has receipts">
          <p className="text-sm text-[var(--muted)]">
            Provenance is a product surface: not a compliance appendix. Lineage is queryable and can be surfaced per object,
            transform, and analysis step.
          </p>
          <CodeBlock_1.CodeBlock code={`Provenance = { who, what, when, why, inputs[], outputs[], policy_context }`}/>
        </Card_1.Card>
      </div>
    </div>);
}
