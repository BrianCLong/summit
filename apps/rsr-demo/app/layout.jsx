import './styles.css';

export const metadata = {
  title: 'Retrieval Safety Router Demo',
  description: 'Deterministic governance decisions for retrieval queries.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
