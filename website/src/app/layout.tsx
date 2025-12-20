import type { Metadata } from "next";
import type { ReactNode } from "react";
import "./globals.css";
import "@/styles/tokens.css";
import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { buildMetadata } from "@/lib/seo";

export const metadata: Metadata = buildMetadata({
  title: "Topicality",
  description:
    "Topicality builds, studies, and deploys complex systems—products, research, and initiatives designed for trust, clarity, and iteration.",
  path: "/"
});

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:top-2 focus:left-2 focus:z-50 focus:rounded focus:bg-black focus:px-3 focus:py-2 focus:text-white"
          href="#content"
        >
          Skip to content
        </a>
        <div className="min-h-dvh bg-[var(--bg)] text-[var(--fg)]">
          <Header />
          <main id="content" className="mx-auto w-full max-w-6xl px-5 py-10">
            {children}
          </main>
          <Footer />
        </div>
      </body>
    </html>
  );
}
