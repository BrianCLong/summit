import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { Pill } from '@/components/site/Pill';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Status',
  description: 'System status for Topicality services.',
  path: '/status',
});

export default function StatusPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="System Status"
        subtitle="Current operational status of Topicality services."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="Website" subtitle="topicality.co">
          <div className="flex items-center gap-2">
            <Pill variant="success">Operational</Pill>
          </div>
        </Card>
        <Card title="Summit Platform" subtitle="Production services">
          <div className="flex items-center gap-2">
            <Pill variant="success">Operational</Pill>
          </div>
        </Card>
        <Card title="API Gateway" subtitle="GraphQL API">
          <div className="flex items-center gap-2">
            <Pill variant="success">Operational</Pill>
          </div>
        </Card>
        <Card title="Analytics" subtitle="First-party tracking">
          <div className="flex items-center gap-2">
            <Pill variant="success">Operational</Pill>
          </div>
        </Card>
      </div>

      <Section kicker="History" title="Recent incidents">
        <p className="text-sm text-[var(--muted)]">
          No incidents reported in the last 30 days.
        </p>
      </Section>

      <Section kicker="Updates" title="Scheduled maintenance">
        <p className="text-sm text-[var(--muted)]">
          No scheduled maintenance at this time.
        </p>
      </Section>
    </div>
  );
}
