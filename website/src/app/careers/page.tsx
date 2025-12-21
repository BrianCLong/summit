import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Careers',
  description: 'Work on complex systems at Topicality.',
  path: '/careers',
});

export default function CareersPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Careers"
        subtitle="Work on complex systems that demand trust, clarity, and operational rigor."
      />

      <Section
        kicker="Philosophy"
        title="How we work"
        subtitle="What it's like to build at Topicality"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Depth over breadth" subtitle="Focus on what matters">
            <p className="text-sm text-[var(--muted)]">
              We prefer going deep on specific problems rather than spreading
              thin across many. Quality comes from sustained attention.
            </p>
          </Card>
          <Card title="Clarity as craft" subtitle="Precision in thought and code">
            <p className="text-sm text-[var(--muted)]">
              We value clear thinking, clear writing, and clear code. Ambiguity
              is a bug to be fixed, not a feature to be tolerated.
            </p>
          </Card>
          <Card title="Trust as product" subtitle="Not just a value">
            <p className="text-sm text-[var(--muted)]">
              We build systems where trust is tangible—auditable, explainable,
              and earned through transparent behavior.
            </p>
          </Card>
          <Card title="Iteration discipline" subtitle="Learn and improve">
            <p className="text-sm text-[var(--muted)]">
              We instrument our systems to learn and design them to change
              safely. Continuous improvement is structural, not aspirational.
            </p>
          </Card>
        </div>
      </Section>

      <Section kicker="Open roles" title="Current opportunities">
        <p className="text-sm text-[var(--muted)]">
          We don&apos;t have any open roles listed publicly at the moment. If
          you&apos;re interested in working with us, reach out with context
          about what you&apos;d want to build and why.
        </p>
        <p className="pt-3 text-sm">
          <a
            href="mailto:careers@topicality.co"
            className="text-[var(--accent)] hover:underline"
          >
            careers@topicality.co
          </a>
        </p>
      </Section>
    </div>
  );
}
