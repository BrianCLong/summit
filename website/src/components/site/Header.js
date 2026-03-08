"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Header = Header;
const link_1 = __importDefault(require("next/link"));
const MobileNav_1 = require("@/components/site/MobileNav");
const client_1 = require("@/lib/analytics/client");
const links = [
    { href: "/summit", label: "Summit" },
    { href: "/initiatives", label: "Initiatives" },
    { href: "/research", label: "Research" },
    { href: "/writing", label: "Writing" },
    { href: "/contact", label: "Contact" }
];
function Header() {
    return (<header className="sticky top-0 z-40 border-b border-[var(--border)] bg-[rgba(11,15,20,0.85)] backdrop-blur">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
        <link_1.default href="/" className="font-semibold tracking-tight" onClick={() => (0, client_1.track)("nav_click", { to: "/", label: "Topicality" })}>
          Topicality<span className="text-[var(--muted2)]">.co</span>
        </link_1.default>
        <nav className="hidden gap-5 md:flex">
          {links.map((l) => (<link_1.default key={l.href} href={l.href} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]" onClick={() => (0, client_1.track)("nav_click", { to: l.href, label: l.label })}>
              {l.label}
            </link_1.default>))}
        </nav>
        <MobileNav_1.MobileNav links={links}/>
      </div>
    </header>);
}
