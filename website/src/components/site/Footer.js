"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Footer = Footer;
const link_1 = __importDefault(require("next/link"));
function Footer() {
    return (<footer className="border-t border-[var(--border)]">
      <div className="mx-auto max-w-6xl px-5 py-10 text-sm text-[var(--muted)]">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <span>© {new Date().getFullYear()} Topicality</span>
          <div className="flex gap-4">
            <link_1.default className="hover:text-[var(--fg)]" href="/privacy">
              Privacy
            </link_1.default>
            <link_1.default className="hover:text-[var(--fg)]" href="/legal">
              Legal
            </link_1.default>
            <link_1.default className="hover:text-[var(--fg)]" href="/status">
              Status
            </link_1.default>
          </div>
        </div>
      </div>
    </footer>);
}
