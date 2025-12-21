import type { Metadata } from 'next';
import './globals.css';
import '@/styles/tokens.css';
import { Header } from '@/components/site/Header';
import { Footer } from '@/components/site/Footer';
import { defaultMetadata } from '@/lib/seo';

export const metadata: Metadata = defaultMetadata;

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <a
          className="sr-only focus:not-sr-only focus:fixed focus:left-2 focus:top-2 focus:z-50 focus:rounded focus:bg-black focus:px-3 focus:py-2 focus:text-white"
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
