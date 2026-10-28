import { Analytics } from '@vercel/analytics/react';
import type { Metadata } from 'next';
import { Noto_Sans_TC } from 'next/font/google';
import './globals.css';
import { Navbar } from '@/components/site/navbar';
import { Footer } from '@/components/site/footer';
import { ThemeProvider } from '@/components/site/theme-provider';

const notoSansTC = Noto_Sans_TC({
  subsets: ['latin'],
  weight: ['300', '400', '500', '700', '900'],
  variable: '--font-sans',
  display: 'swap',
});

// export const dynamic = 'force-dynamic'

export const metadata: Metadata = {
  metadataBase: new URL('https://myportfolio-amber-six-18.vercel.app/'),
  title: '楊軒羽 | Senior AI & Full-Stack Engineer Portfolio',
  description:
    '楊軒羽 (Shen Yang) — 高級 AI & 全端工程師。專注於自動化、高效能、全端架構與現代化 Web 開發。AI / LLM · Python · React · Next.js · TypeScript · Automation · Supabase。',
  icons: {
    icon: '/favicon.png',
    shortcut: '/favicon.png',
    apple: '/JSface.jpg',
  },
  keywords: [
    '楊軒羽',
    'Shen Yang',
    'Senior AI & Full-Stack Engineer',
    'React',
    'Next.js',
    'TypeScript',
    'Supabase',
    'Portfolio',
  ],
  authors: [{ name: '楊軒羽 (Shen Yang)' }],
  openGraph: {
    title: '楊軒羽 | Senior Full-Stack Engineer Portfolio',
    description:
      '專注於高效能、全端架構與現代化 Web 開發的 Senior 工程師',
    type: 'website',
    locale: 'zh_TW',
    images: [
      {
        url: '/JSface.jpg',
        width: 600,
        height: 600,
        alt: '楊軒羽 Shen Yang',
      },
    ],
  },
  twitter: {
    card: 'summary_large_image',
    title: '楊軒羽 | Senior Full-Stack Engineer Portfolio',
    description:
      '專注於高效能、全端架構與現代化 Web 開發的 Senior 工程師',
    images: ['/JSface.jpg'],
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-TW" suppressHydrationWarning>
      <body className={`${notoSansTC.variable} font-sans antialiased`}>
        <ThemeProvider>
          <div className="relative min-h-screen flex flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </ThemeProvider>
        <Analytics />
      </body>
    </html>
  );
}
