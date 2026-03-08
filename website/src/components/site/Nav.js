"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Nav = Nav;
const link_1 = __importDefault(require("next/link"));
function Nav({ items }) {
    return (<nav className="flex flex-wrap gap-2">
      {items.map((item) => (<link_1.default key={item.href} href={item.href} className="rounded-full border border-[var(--border)] px-4 py-2 text-sm text-[var(--muted)] hover:text-[var(--fg)]">
          {item.label}
        </link_1.default>))}
    </nav>);
}
