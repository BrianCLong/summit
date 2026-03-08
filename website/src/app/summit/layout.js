"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = SummitLayout;
const Nav_1 = require("@/components/site/Nav");
const summitNav = [
    { href: "/summit", label: "Overview" },
    { href: "/summit/pages/capabilities", label: "Capabilities" },
    { href: "/summit/pages/architecture", label: "Architecture" },
    { href: "/summit/pages/security", label: "Security & Governance" },
    { href: "/summit/pages/use-cases", label: "Use cases" },
    { href: "/summit/pages/roadmap", label: "Roadmap" },
    { href: "/summit/pages/faq", label: "FAQ" }
];
function SummitLayout({ children }) {
    return (<div className="space-y-8">
      <Nav_1.Nav items={summitNav}/>
      {children}
    </div>);
}
