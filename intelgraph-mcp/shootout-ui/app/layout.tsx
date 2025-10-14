import './globals.css';
import type { ReactNode } from 'react';

export const metadata = {
  title: 'IntelGraph MCP Shootout',
  description: 'Benchmark scoreboard for IntelGraph Maestro Conductor vs competitors.'
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
