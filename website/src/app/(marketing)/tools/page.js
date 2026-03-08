"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = ToolsPage;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
function ToolsPage() {
    return (<div className="space-y-8">
      <Section_1.Section kicker="Tools" title="Tools" subtitle="Utilities and interfaces that extend initiatives without creating shadow systems."/>
      <Card_1.Card title="First-party analytics" subtitle="Instrumentation that respects privacy">
        <p className="text-sm text-[var(--muted)]">
          Client events route through a first-party collector with safe properties. Additional destinations can be added without
          changing the client contract.
        </p>
      </Card_1.Card>
    </div>);
}
