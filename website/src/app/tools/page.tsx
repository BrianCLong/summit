import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Tools',
  description:
    'Utilities and libraries that support our initiatives and the broader ecosystem.',
  path: '/tools',
});

export default function ToolsPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Tools"
        subtitle="Utilities and libraries that support our initiatives and the broader ecosystem."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Provenance SDK" subtitle="Lineage tracking primitives">
          <p className="text-sm text-[var(--muted)]">
            A library for recording and querying provenance in applications
            that need to answer "what happened and why."
          </p>
        </Card>
        <Card title="Policy engine" subtitle="Executable governance">
          <p className="text-sm text-[var(--muted)]">
            Tools for expressing, evaluating, and enforcing policy constraints
            across systems.
          </p>
        </Card>
        <Card title="Graph utilities" subtitle="Common graph operations">
          <p className="text-sm text-[var(--muted)]">
            Shared utilities for working with graph data: traversals, pattern
            matching, and visualization helpers.
          </p>
        </Card>
        <Card title="Evaluation framework" subtitle="Measuring system quality">
          <p className="text-sm text-[var(--muted)]">
            A framework for defining and running evaluations against complex
            systems.
          </p>
        </Card>
      </div>
    </div>
  );
}
