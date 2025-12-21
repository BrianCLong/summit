'use client';

import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { summit } from '@/content/summit';
import { track } from '@/lib/analytics/client';

export default function SummitOverview() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title={summit.hero.title}
        subtitle={summit.hero.subtitle}
      >
        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            href="/summit/capabilities"
            onClick={() =>
              track('cta_click', { id: 'summit_overview_capabilities' })
            }
          >
            Capabilities
          </Button>
          <Button
            variant="secondary"
            href="/summit/architecture"
            onClick={() =>
              track('cta_click', { id: 'summit_overview_architecture' })
            }
          >
            Architecture
          </Button>
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-3">
        {summit.summary.map((s) => (
          <Card key={s.title} title={s.title} subtitle={s.subtitle}>
            <p className="text-sm text-[var(--muted)]">{s.body}</p>
          </Card>
        ))}
      </div>

      <Section
        kicker="Trust surface"
        title="Governance + provenance are product features"
        subtitle="Summit assumes scrutiny: security review, audit trails, policy enforcement, evidence trails, and explainability as default posture."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {summit.trust.map((t) => (
            <Card key={t.title} title={t.title} subtitle={t.subtitle}>
              <p className="text-sm text-[var(--muted)]">{t.body}</p>
            </Card>
          ))}
        </div>
      </Section>

      <Section
        kicker="Live testing"
        title="Instrumented to learn"
        subtitle="Every meaningful interaction can be measured without collecting sensitive content."
      >
        <Card title="What we measure" subtitle="Signals, not surveillance">
          <ul className="list-disc space-y-1 pl-5 text-sm text-[var(--muted)]">
            {summit.measure.map((m) => (
              <li key={m}>{m}</li>
            ))}
          </ul>
        </Card>
      </Section>
    </div>
  );
}
