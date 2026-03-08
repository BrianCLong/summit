"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Architecture;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
const Table_1 = require("@/components/ui/Table");
function Architecture() {
    return (<div className="space-y-10">
      <Section_1.Section kicker="Summit" title="Architecture" subtitle="A system designed to scale across evidence volume, scrutiny, and organizational complexity—without collapsing into spaghetti."/>
      <Card_1.Card title="Key architectural commitments" subtitle="Stable primitives that survive growth">
        <Table_1.Table columns={["Primitive", "Purpose", "Why it matters"]} rows={[
            ["Evidence object", "Immutable reference to source artifact", "Enables auditability + reprocessing"],
            ["Transform step", "Explicit mapping from inputs → outputs", "Prevents invisible changes"],
            ["Policy context", "Executable constraints around actions/data", "Makes governance real"],
            ["Narrative overlay", "Human interpretation without mutating facts", "Separates evidence from hypotheses"]
        ]}/>
      </Card_1.Card>
      <div className="grid gap-4 md:grid-cols-2">
        <Card_1.Card title="Obvious-to-auditors" subtitle="Designed for review">
          <p className="text-sm text-[var(--muted)]">
            The architecture makes it easy to answer: what happened, who did it, why it was permitted, and what evidence supports
            the current state.
          </p>
        </Card_1.Card>
        <Card_1.Card title="Obvious-to-operators" subtitle="Designed for operations">
          <p className="text-sm text-[var(--muted)]">
            Operational workflows are first-class: health endpoints, predictable deployments, measurable behaviors, and a clear
            separation of concerns.
          </p>
        </Card_1.Card>
      </div>
    </div>);
}
