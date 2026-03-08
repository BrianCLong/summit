"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.MobileNav = MobileNav;
const link_1 = __importDefault(require("next/link"));
const react_1 = require("react");
const client_1 = require("@/lib/analytics/client");
function MobileNav({ links }) {
    const [open, setOpen] = (0, react_1.useState)(false);
    return (<div className="md:hidden">
      <button type="button" className="rounded-md border border-[var(--border)] px-3 py-2 text-sm text-[var(--fg)]" onClick={() => setOpen((prev) => !prev)} aria-expanded={open} aria-label="Toggle navigation">
        Menu
      </button>
      {open ? (<div className="absolute right-4 mt-2 w-48 rounded-xl border border-[var(--border)] bg-[var(--card)] p-3 shadow-[var(--shadow)]">
          <nav className="flex flex-col gap-2">
            {links.map((l) => (<link_1.default key={l.href} href={l.href} className="text-sm text-[var(--muted)] hover:text-[var(--fg)]" onClick={() => {
                    setOpen(false);
                    (0, client_1.track)("nav_click", { to: l.href, label: l.label });
                }}>
                {l.label}
              </link_1.default>))}
          </nav>
        </div>) : null}
    </div>);
}
