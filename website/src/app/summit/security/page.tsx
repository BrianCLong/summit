import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { summit } from '@/content/summit';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Summit Security & Governance',
  description:
    'Security is not a checklist; it is a set of product constraints that shape what users can do, what the system will allow, and what can be proven later.',
  path: '/summit/security',
});

export default function Security() {
  const { security } = summit;

  return (
    <div className="space-y-10">
      <Section
        kicker="Summit"
        title="Security & Governance"
        subtitle="Security is not a checklist; it is a set of product constraints that shape what users can do, what the system will allow, and what can be proven later."
      />

      <div className="grid gap-4 md:grid-cols-2">
        {security.principles.map((p) => (
          <Card key={p.title} title={p.title} subtitle={p.subtitle}>
            <p className="text-sm text-[var(--muted)]">{p.body}</p>
          </Card>
        ))}
      </div>

      <Section
        kicker="Posture"
        title="Security assumptions"
        subtitle="How Summit approaches security at a structural level"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <Card title="Defense in depth" subtitle="Layered security">
            <p className="text-sm text-[var(--muted)]">
              Security controls exist at multiple layers: network, application,
              data, and user interface. Compromise of one layer does not
              automatically compromise others.
            </p>
          </Card>
          <Card title="Zero trust" subtitle="Verify explicitly">
            <p className="text-sm text-[var(--muted)]">
              Authorization decisions are made explicitly at each boundary.
              Trust is not inherited from previous operations or contexts.
            </p>
          </Card>
          <Card title="Audit by default" subtitle="Everything is logged">
            <p className="text-sm text-[var(--muted)]">
              Security-relevant operations are logged with sufficient context
              for forensic analysis. Logs are protected from tampering.
            </p>
          </Card>
          <Card title="Least privilege" subtitle="Minimal permissions">
            <p className="text-sm text-[var(--muted)]">
              Users and services receive only the permissions necessary for
              their function. Elevated privileges are time-bounded and logged.
            </p>
          </Card>
        </div>
      </Section>

      <Section
        kicker="Governance"
        title="Policy enforcement"
        subtitle="How governance manifests in the system"
      >
        <div className="grid gap-4 md:grid-cols-3">
          <Card title="Policy gates" subtitle="Enforcement points">
            <p className="text-sm text-[var(--muted)]">
              Sensitive operations pass through policy gates that evaluate
              constraints before allowing execution.
            </p>
          </Card>
          <Card title="Decision logs" subtitle="Audit trail">
            <p className="text-sm text-[var(--muted)]">
              Policy decisions are logged with context: what was requested, what
              constraints applied, and what decision was made.
            </p>
          </Card>
          <Card title="Review workflows" subtitle="Human oversight">
            <p className="text-sm text-[var(--muted)]">
              High-impact operations can require human review before execution,
              with approval recorded in the audit trail.
            </p>
          </Card>
        </div>
      </Section>
    </div>
  );
}
