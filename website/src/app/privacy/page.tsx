import { Section } from '@/components/site/Section';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Privacy',
  description: 'Privacy policy for Topicality.',
  path: '/privacy',
});

export default function PrivacyPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Privacy Policy"
        subtitle="How we handle your information."
      />

      <Section kicker="Data collection" title="What we collect">
        <div className="space-y-4 text-sm text-[var(--muted)]">
          <p>
            We collect minimal data necessary to operate and improve this
            website:
          </p>
          <ul className="list-disc space-y-2 pl-5">
            <li>
              <strong>Analytics events:</strong> Page views, navigation clicks,
              and interaction events. These are privacy-preserving and do not
              include personal identifiers.
            </li>
            <li>
              <strong>Contact information:</strong> If you email us, we retain
              your correspondence to respond and improve our communications.
            </li>
          </ul>
        </div>
      </Section>

      <Section kicker="Usage" title="How we use data">
        <div className="space-y-4 text-sm text-[var(--muted)]">
          <p>We use collected data to:</p>
          <ul className="list-disc space-y-2 pl-5">
            <li>Understand how visitors use the website</li>
            <li>Identify areas for improvement</li>
            <li>Respond to inquiries</li>
          </ul>
          <p>
            We do not sell, rent, or share your information with third parties
            for marketing purposes.
          </p>
        </div>
      </Section>

      <Section kicker="Storage" title="Data retention">
        <div className="space-y-4 text-sm text-[var(--muted)]">
          <p>
            Analytics data is retained in aggregate form. We do not store
            individual user sessions or personal browsing histories.
          </p>
          <p>
            Email correspondence is retained as long as necessary to address
            your inquiry and maintain records for legal purposes.
          </p>
        </div>
      </Section>

      <Section kicker="Contact" title="Questions">
        <p className="text-sm text-[var(--muted)]">
          If you have questions about this privacy policy, contact us at{' '}
          <a
            href="mailto:privacy@topicality.co"
            className="text-[var(--accent)] hover:underline"
          >
            privacy@topicality.co
          </a>
          .
        </p>
      </Section>
    </div>
  );
}
