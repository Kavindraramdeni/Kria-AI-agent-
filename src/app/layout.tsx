import type { Metadata } from 'next';
import localFont from 'next/font/local';
import './globals.css';
import { Sidebar } from '@/components/layout/sidebar';

const geistSans = localFont({
  src: './fonts/GeistVF.woff',
  variable: '--font-geist-sans',
  weight: '100 900',
});

const geistMono = localFont({
  src: './fonts/GeistMonoVF.woff',
  variable: '--font-geist-mono',
  weight: '100 900',
});

export const metadata: Metadata = {
  title: 'KRIA AI — Operations & Growth Command Center',
  description: 'AI-powered marketing, SEO, leads CRM and operations platform for KRIA TECH custom acrylic and manufacturing.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className={`${geistSans.variable} ${geistMono.variable} bg-kria-950 text-slate-100 antialiased font-sans min-h-screen`}>
        <div className="flex min-h-screen bg-kria-950">
          <Sidebar />
          <div className="flex-1 lg:pl-64 flex flex-col min-h-screen overflow-x-hidden">
            {children}
          </div>
        </div>
      </body>
    </html>
  );
}
