import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'Retentiond Dashboard',
  description: 'Visibility into upcoming expirations and deletion KPIs'
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
