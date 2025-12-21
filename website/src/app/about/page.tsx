import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'About',
  description:
    'Topicality builds, studies, and deploys complex systems designed for trust, clarity, and iteration.',
  path: '/about',
});

export default function AboutPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="About"
        subtitle="Topicality builds, studies, and deploys complex systems designed for trust, clarity, and iteration."
      />

      <Section kicker="Mission" title="Why we exist">
        <p className="text-sm text-[var(--muted)] md:text-base">
          Complex systems—intelligence platforms, governance tools, analytical
          infrastructure—often fail not because the technology is wrong, but
          because the design doesn&apos;t account for the humans who must
          trust, operate, and evolve them.
        </p>
        <p className="pt-4 text-sm text-[var(--muted)] md:text-base">
          Topicality exists to build systems where trust is a product surface,
          not an afterthought. Where governance is executable, not just
          documented. Where iteration is safe because the architecture was
          designed for change.
        </p>
      </Section>

      <div className="grid gap-4 md:grid-cols-3">
        <Card title="Trust" subtitle="As a design constraint">
          <p className="text-sm text-[var(--muted)]">
            Systems should be auditable, explainable, and transparent by
            default—not as a compliance feature, but as a design principle.
          </p>
        </Card>
        <Card title="Clarity" subtitle="As an operational requirement">
          <p className="text-sm text-[var(--muted)]">
            Systems should be obvious to operate: predictable deployments,
            clear health signals, and understandable failure modes.
          </p>
        </Card>
        <Card title="Iteration" subtitle="As a structural property">
          <p className="text-sm text-[var(--muted)]">
            Systems should be built to change: instrumented to learn, designed
            to evolve, and structured to avoid breaking when they do.
          </p>
        </Card>
      </div>
    </div>
  );
}
