"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = Roadmap;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
function Roadmap() {
    return (<div className="space-y-10">
      <Section_1.Section kicker="Summit" title="Roadmap" subtitle="A disciplined roadmap: deepen trust surfaces, expand capabilities, keep the architecture legible."/>
      <div className="grid gap-4 md:grid-cols-3">
        <Card_1.Card title="Now" subtitle="Make the system operationally obvious">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Harden provenance UX</li>
            <li>Policy enforcement visibility</li>
            <li>First-party analytics + learnings</li>
          </ul>
        </Card_1.Card>
        <Card_1.Card title="Next" subtitle="Scale and specialize">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Richer overlays</li>
            <li>Stronger evaluation discipline</li>
            <li>Operational playbooks</li>
          </ul>
        </Card_1.Card>
        <Card_1.Card title="Later" subtitle="Ecosystem expansion">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            <li>Additional initiatives under Topicality</li>
            <li>More tools and publications</li>
            <li>Deeper partner surfaces</li>
          </ul>
        </Card_1.Card>
      </div>
    </div>);
}
