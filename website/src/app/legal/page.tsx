import { Section } from '@/components/site/Section';
import { buildMetadata } from '@/lib/seo';

export const metadata = buildMetadata({
  title: 'Legal',
  description: 'Legal information and terms of use for Topicality.',
  path: '/legal',
});

export default function LegalPage() {
  return (
    <div className="space-y-10">
      <Section
        kicker="Topicality"
        title="Legal"
        subtitle="Terms of use and legal information."
      />

      <Section kicker="Terms" title="Terms of Use">
        <div className="space-y-4 text-sm text-[var(--muted)]">
          <p>
            By accessing and using this website, you accept and agree to be
            bound by the terms and conditions of use.
          </p>
          <p>
            The content on this website is provided for general information
            purposes only. We make no representations or warranties about the
            completeness, accuracy, or reliability of any information on the
            site.
          </p>
          <p>
            We reserve the right to modify these terms at any time. Continued
            use of the site constitutes acceptance of modified terms.
          </p>
        </div>
      </Section>

      <Section kicker="Intellectual property" title="Copyright">
        <div className="space-y-4 text-sm text-[var(--muted)]">
          <p>
            All content on this website, including text, graphics, logos, and
            software, is the property of Topicality and is protected by
            copyright laws.
          </p>
          <p>
            You may not reproduce, distribute, or create derivative works from
            any content without prior written permission.
          </p>
        </div>
      </Section>

      <Section kicker="Liability" title="Disclaimer">
        <div className="space-y-4 text-sm text-[var(--muted)]">
          <p>
            This website and its contents are provided &quot;as is&quot; without
            warranties of any kind. We disclaim all liability for any damages
            arising from your use of or inability to use this website.
          </p>
        </div>
      </Section>
    </div>
  );
}
