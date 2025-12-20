import type { ReactNode } from "react";

import { Nav } from "@/components/site/Nav";

const summitNav = [
  { href: "/summit", label: "Overview" },
  { href: "/summit/pages/capabilities", label: "Capabilities" },
  { href: "/summit/pages/architecture", label: "Architecture" },
  { href: "/summit/pages/security", label: "Security & Governance" },
  { href: "/summit/pages/use-cases", label: "Use cases" },
  { href: "/summit/pages/roadmap", label: "Roadmap" },
  { href: "/summit/pages/faq", label: "FAQ" }
];

export default function SummitLayout({ children }: { children: ReactNode }) {
  return (
    <div className="space-y-8">
      <Nav items={summitNav} />
      {children}
    </div>
  );
}
