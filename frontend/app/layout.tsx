import type { Metadata } from 'next';
import { Inria_Serif, Inter } from 'next/font/google';
import './globals.css';
import { Providers } from './providers';

// UI / body — Inter is a variable font (full weight range).
const inter = Inter({
  variable: '--font-inter',
  subsets: ['latin'],
  display: 'swap',
});

// Titles / headings — Inria Serif ships fixed weights; we use Regular + Bold.
const inriaSerif = Inria_Serif({
  variable: '--font-inria-serif',
  subsets: ['latin'],
  weight: ['400', '700'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Notes',
  description: 'A charming little notes app.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${inter.variable} ${inriaSerif.variable} h-full`}>
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
