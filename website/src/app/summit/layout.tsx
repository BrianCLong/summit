import { Nav } from '@/components/site/Nav';

const summitNav = [
  { href: '/summit', label: 'Overview' },
  { href: '/summit/capabilities', label: 'Capabilities' },
  { href: '/summit/architecture', label: 'Architecture' },
  { href: '/summit/security', label: 'Security' },
  { href: '/summit/use-cases', label: 'Use Cases' },
  { href: '/summit/roadmap', label: 'Roadmap' },
  { href: '/summit/faq', label: 'FAQ' },
];

export default function SummitLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-8">
      <Nav items={summitNav} />
      {children}
    </div>
  );
}
