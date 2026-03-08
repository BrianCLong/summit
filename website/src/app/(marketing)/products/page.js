"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ProductsPage;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
function ProductsPage() {
    return (<div className="space-y-8">
      <Section_1.Section kicker="Products" title="Products" subtitle="Built for real operators: governed, observable, and ready for scrutiny."/>
      <Card_1.Card title="Summit" subtitle="Intelligence workflows with governance">
        <p className="text-sm text-[var(--muted)]">
          Summit packages ingest, graph reasoning, provenance, and predictive overlays with clear trust boundaries. Additional
          product surfaces can be layered without reworking the core architecture.
        </p>
      </Card_1.Card>
    </div>);
}
