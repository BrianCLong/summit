"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ResearchPage;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
function ResearchPage() {
    return (<div className="space-y-8">
      <Section_1.Section kicker="Research" title="Research" subtitle="Structured to publish applied research without fragmenting the product narrative."/>
      <Card_1.Card title="Governed intelligence" subtitle="Research tracks">
        <p className="text-sm text-[var(--muted)]">
          Research spans provenance modeling, policy enforcement in ML pipelines, and evaluation frameworks for trustworthy
          automation.
        </p>
      </Card_1.Card>
    </div>);
}
