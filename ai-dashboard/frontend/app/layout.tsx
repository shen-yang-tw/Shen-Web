import type { Metadata, Viewport } from 'next'
import { AppShell } from './components/app-shell'
import './globals.css'

export const metadata: Metadata = {
  title: 'PredictFlow AI | SaaS & ModelOps Dashboard',
  description: 'SaaS churn, MRR forecasting and ModelOps cost monitoring dashboard powered by PredictFlow AI.',
  icons: { icon: '/logo.svg' },
}

export const viewport: Viewport = {
  themeColor: '#0b1120',
  userScalable: false,
}

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className="min-h-screen antialiased">
        <AppShell>{children}</AppShell>
      </body>
    </html>
  )
}
