'use client';

import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { topicality } from '@/content/topicality';
import { track } from '@/lib/analytics/client';

export default function HomePage() {
  return (
    <div className="space-y-10">
      <Section
        kicker={topicality.hero.kicker}
        title={topicality.hero.title}
        subtitle={topicality.hero.subtitle}
      >
        <div className="flex flex-wrap gap-3 pt-4">
          <Button
            href="/summit"
            onClick={() => track('nav_click', { to: '/summit', label: 'Explore Summit' })}
          >
            Explore Summit
          </Button>
          <Button
            variant="secondary"
            href="/initiatives"
            onClick={() => track('nav_click', { to: '/initiatives', label: 'Initiatives' })}
          >
            Initiatives
          </Button>
        </div>
      </Section>

      <div className="grid gap-4 md:grid-cols-3">
        {topicality.pillars.map((p) => (
          <Card key={p.title} title={p.title} subtitle={p.subtitle}>
            <p className="text-sm text-[var(--muted)]">{p.body}</p>
          </Card>
        ))}
      </div>

      <Section
        kicker="Flagship initiative"
        title="Summit"
        subtitle="A deep product surface for intelligence, governance, provenance, and predictive systems—built to be audited, operated, and iterated."
      >
        <div className="grid gap-4 md:grid-cols-2">
          {topicality.summitHighlights.map((h) => (
            <Card key={h.title} title={h.title} subtitle={h.subtitle}>
              <p className="text-sm text-[var(--muted)]">{h.body}</p>
            </Card>
          ))}
        </div>
        <div className="pt-5">
          <Button
            href="/summit"
            onClick={() => track('cta_click', { id: 'home_summit_primary', to: '/summit' })}
          >
            Go to Summit &rarr;
          </Button>
        </div>
      </Section>
    </div>
  );
}
