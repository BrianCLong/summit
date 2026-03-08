"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = LabsPage;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
function LabsPage() {
    return (<div className="space-y-8">
      <Section_1.Section kicker="Labs" title="Labs" subtitle="Applied research spaces for experimentation without jeopardizing production posture."/>
      <Card_1.Card title="Systems lab" subtitle="Inference + provenance">
        <p className="text-sm text-[var(--muted)]">
          Focused on provenance-aware inference, evaluation harnesses, and policy-aware agents that can be promoted into
          production initiatives.
        </p>
      </Card_1.Card>
    </div>);
}
