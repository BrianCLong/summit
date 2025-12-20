import React from 'react';
import './globals.css';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className="p-4 bg-gray-50 text-gray-900 h-screen w-screen overflow-hidden">
        {children}
      </body>
    </html>
  );
}
