import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Research',
  description:
    'Foundational work on trust, governance, and complex systems that informs our initiatives.',
  path: '/research',
});

export default function ResearchPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Research"
        subtitle="Foundational work on trust, governance, and complex systems that informs our initiatives."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Trust surfaces" subtitle="Making trust tangible">
          <p className="text-sm text-[var(--muted)]">
            Research into how systems can make trust visible and actionable—not
            as an abstract property, but as a concrete interface.
          </p>
        </Card>
        <Card title="Governance primitives" subtitle="Policy as architecture">
          <p className="text-sm text-[var(--muted)]">
            Exploring the fundamental building blocks of governance: what
            primitives enable flexible, enforceable, observable policy?
          </p>
        </Card>
      </div>

      <Section
        kicker="Approach"
        title="Research principles"
        subtitle="How we approach foundational work"
      >
        <ul className="list-disc space-y-2 pl-5 text-sm text-[var(--muted)]">
          <li>
            Research should be deployable: insights that cannot be implemented
            are incomplete.
          </li>
          <li>
            Precision over coverage: we prefer depth on specific questions to
            breadth across many.
          </li>
          <li>
            Evaluation is continuous: we build measurement into research from
            the start.
          </li>
          <li>
            Open where possible: sharing findings benefits the broader
            ecosystem.
          </li>
        </ul>
      </Section>
    </div>
  );
}
