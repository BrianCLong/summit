import { Section } from '@/components/site/Section';
import { Card } from '@/components/ui/Card';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Contact',
  description: 'Get in touch with Topicality.',
  path: '/contact',
});

export default function ContactPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Contact"
        subtitle="Get in touch with us."
      />

      <div className="grid gap-4 md:grid-cols-2">
        <Card title="General inquiries" subtitle="Questions about Topicality">
          <p className="text-sm text-[var(--muted)]">
            For general questions about Topicality, our initiatives, or
            potential collaborations.
          </p>
          <p className="pt-3 text-sm">
            <a
              href="mailto:hello@topicality.co"
              className="text-[var(--accent)] hover:underline"
            >
              hello@topicality.co
            </a>
          </p>
        </Card>
        <Card title="Summit" subtitle="Platform inquiries">
          <p className="text-sm text-[var(--muted)]">
            For questions specifically about Summit—capabilities, deployment,
            or evaluation.
          </p>
          <p className="pt-3 text-sm">
            <a
              href="mailto:summit@topicality.co"
              className="text-[var(--accent)] hover:underline"
            >
              summit@topicality.co
            </a>
          </p>
        </Card>
      </div>

      <Section
        kicker="Expectations"
        title="Response time"
        subtitle="We read everything and respond to what we can help with."
      >
        <p className="text-sm text-[var(--muted)]">
          We aim to respond to inquiries within a few business days. If your
          question is specific and actionable, you&apos;re more likely to get a
          useful response quickly.
        </p>
      </Section>
    </div>
  );
}
