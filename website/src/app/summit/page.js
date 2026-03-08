"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SummitOverview;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const summit_1 = require("@/content/summit");
const client_1 = require("@/lib/analytics/client");
function SummitOverview() {
    return (<div className="space-y-10">
      <Section_1.Section kicker="Summit" title={summit_1.summit.hero.title} subtitle={summit_1.summit.hero.subtitle}>
        <div className="flex flex-wrap gap-3 pt-4">
          <Button_1.Button href="/summit/pages/capabilities" onClick={() => (0, client_1.track)("cta_click", { id: "summit_overview_capabilities" })}>
            Capabilities
          </Button_1.Button>
          <Button_1.Button variant="secondary" href="/summit/pages/architecture" onClick={() => (0, client_1.track)("cta_click", { id: "summit_overview_architecture" })}>
            Architecture
          </Button_1.Button>
        </div>
      </Section_1.Section>

      <div className="grid gap-4 md:grid-cols-3">
        {summit_1.summit.summary.map((s) => (<Card_1.Card key={s.title} title={s.title} subtitle={s.subtitle}>
            <p className="text-sm text-[var(--muted)]">{s.body}</p>
          </Card_1.Card>))}
      </div>

      <Section_1.Section kicker="Trust surface" title="Governance + provenance are product features" subtitle="Summit assumes scrutiny: security review, audit trails, policy enforcement, evidence trails, and explainability as default posture.">
        <div className="grid gap-4 md:grid-cols-2">
          {summit_1.summit.trust.map((t) => (<Card_1.Card key={t.title} title={t.title} subtitle={t.subtitle}>
              <p className="text-sm text-[var(--muted)]">{t.body}</p>
            </Card_1.Card>))}
        </div>
      </Section_1.Section>

      <Section_1.Section kicker="Live testing" title="Instrumented to learn" subtitle="Every meaningful interaction can be measured without collecting sensitive content.">
        <Card_1.Card title="What we measure" subtitle="Signals, not surveillance">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {summit_1.summit.measure.map((m) => (<li key={m}>{m}</li>))}
          </ul>
        </Card_1.Card>
      </Section_1.Section>
    </div>);
}
