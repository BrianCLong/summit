"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = WritingPage;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
function WritingPage() {
    return (<div className="space-y-8">
      <Section_1.Section kicker="Writing" title="Writing" subtitle="Essays and notes on systems, governance, and operational clarity."/>
      <Card_1.Card title="Publishing cadence" subtitle="Low-noise, high-signal">
        <p className="text-sm text-[var(--muted)]">
          Writing is published when it is ready to influence design or operations. Expect precise language, receipts, and
          evidence rather than marketing filler.
        </p>
      </Card_1.Card>
    </div>);
}
