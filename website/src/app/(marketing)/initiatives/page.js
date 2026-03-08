"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = InitiativesPage;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
function InitiativesPage() {
    return (<div className="space-y-8">
      <Section_1.Section kicker="Topicality" title="Initiatives" subtitle="Topicality is designed to host a family of initiatives—products, labs, and research—without re-architecting the narrative."/>
      <Card_1.Card title="Summit" subtitle="Flagship initiative">
        <p className="text-sm text-[var(--muted)]">
          Summit is the first deep instantiation of the Topicality model: a governed, provenance-forward platform for intelligence
          workflows.
        </p>
      </Card_1.Card>
    </div>);
}
