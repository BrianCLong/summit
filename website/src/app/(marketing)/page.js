"use strict";
"use client";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = HomePage;
const Section_1 = require("@/components/site/Section");
const Card_1 = require("@/components/ui/Card");
const Button_1 = require("@/components/ui/Button");
const topicality_1 = require("@/content/topicality");
const client_1 = require("@/lib/analytics/client");
function HomePage() {
    return (<div className="space-y-10">
      <Section_1.Section kicker={topicality_1.topicality.hero.kicker} title={topicality_1.topicality.hero.title} subtitle={topicality_1.topicality.hero.subtitle}>
        <div className="flex flex-wrap gap-3 pt-4">
          <Button_1.Button href="/summit" onClick={() => (0, client_1.track)("nav_click", { to: "/summit", label: "Explore Summit" })}>
            Explore Summit
          </Button_1.Button>
          <Button_1.Button variant="secondary" href="/initiatives" onClick={() => (0, client_1.track)("nav_click", { to: "/initiatives", label: "Initiatives" })}>
            Initiatives
          </Button_1.Button>
        </div>
      </Section_1.Section>

      <div className="grid gap-4 md:grid-cols-3">
        {topicality_1.topicality.pillars.map((p) => (<Card_1.Card key={p.title} title={p.title} subtitle={p.subtitle}>
            <p className="text-sm text-[var(--muted)]">{p.body}</p>
          </Card_1.Card>))}
      </div>

      <Section_1.Section kicker="Flagship initiative" title="Summit" subtitle="A deep product surface for intelligence, governance, provenance, and predictive systems—built to be audited, operated, and iterated.">
        <div className="grid gap-4 md:grid-cols-2">
          {topicality_1.topicality.summitHighlights.map((h) => (<Card_1.Card key={h.title} title={h.title} subtitle={h.subtitle}>
              <p className="text-sm text-[var(--muted)]">{h.body}</p>
            </Card_1.Card>))}
        </div>
        <div className="pt-5">
          <Button_1.Button href="/summit" onClick={() => (0, client_1.track)("cta_click", { id: "home_summit_primary", to: "/summit" })}>
            Go to Summit →
          </Button_1.Button>
        </div>
      </Section_1.Section>
    </div>);
}
