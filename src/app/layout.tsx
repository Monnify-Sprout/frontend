import type { Metadata } from 'next';
import { Poppins } from 'next/font/google';
import './globals.css';

// Ported from harmony-admin's design system: Poppins is the product typeface.
const poppins = Poppins({
  variable: '--font-poppins',
  weight: ['400', '500', '600', '700'],
  subsets: ['latin'],
  display: 'swap',
});

export const metadata: Metadata = {
  title: 'Sprout',
  description:
    'Get paid and understand your sales. Invoicing and analytics for every Nigerian merchant.',
};

import { QueryProvider } from '@/lib/query';

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${poppins.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col font-sans">
        <QueryProvider>{children}</QueryProvider>
      </body>
    </html>
  );
}
