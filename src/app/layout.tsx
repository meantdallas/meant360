import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import Providers from '@/components/layout/Providers';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Nonprofit Treasurer',
  description: 'Financial management for nonprofit associations',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={inter.className}>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
