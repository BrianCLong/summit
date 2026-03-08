"use strict";
"use client";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.Button = Button;
const link_1 = __importDefault(require("next/link"));
function Button({ href, children, onClick, variant = "primary" }) {
    const cls = variant === "primary"
        ? "bg-[var(--fg)] text-black hover:opacity-90"
        : "border border-[var(--border)] text-[var(--fg)] hover:border-[rgba(255,255,255,0.2)]";
    return (<link_1.default href={href} onClick={onClick} className={`inline-flex items-center justify-center rounded-xl px-4 py-2 text-sm font-medium transition ${cls}`}>
      {children}
    </link_1.default>);
}
