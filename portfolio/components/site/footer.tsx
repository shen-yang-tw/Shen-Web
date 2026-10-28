import Link from 'next/link';
import { Phone, Mail, Code2, Globe, GitBranch } from 'lucide-react';

export function Footer() {
  const currentYear = new Date().getFullYear();

  return (
    <footer className="border-t border-border bg-card/50">
      <div className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 md:grid-cols-3">
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              <div className="relative h-10 w-10 overflow-hidden rounded-lg ring-2 ring-primary/30">
                <img
                  src="/JSface.jpg"
                  alt="楊軒羽"
                  className="h-full w-full object-cover"
                />
              </div>
              <div>
                <p className="font-bold">楊軒羽 Shen Yang</p>
                <p className="text-xs text-muted-foreground">
                  Senior Full-Stack + AI Engineer
                </p>
              </div>
            </div>
            <p className="text-sm text-muted-foreground max-w-xs">
              專注於 AI + Web + Automation 整合的 Senior 工程師
            </p>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">快速連結</p>
            <nav className="flex flex-col gap-2">
              <Link
                href="/"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                首頁
              </Link>
              <Link
                href="/projects"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                專案作品
              </Link>
              <Link
                href="/contact"
                className="text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                聯絡我
              </Link>
            </nav>
          </div>

          <div className="space-y-3">
            <p className="text-sm font-semibold">聯絡資訊</p>
            <div className="flex flex-col gap-2">
              <a
                href="tel:0958804023"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Phone className="h-4 w-4" />
                0958804023
              </a>
              <a
                href="mailto:shen.yang.work.tw@gmail.com"
                className="flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
              >
                <Mail className="h-4 w-4" />
                shen.yang.work.tw@gmail.com
              </a>
            </div>
            <div className="flex gap-3 pt-1">
              <a
                href="https://github.com/shen-yang-tw"
                target="_blank"
                rel="noopener noreferrer"
                aria-label="GitHub"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <GitBranch className="h-4 w-4" />
              </a>
              <a
                href="/projects"
                aria-label="專案"
                className="flex h-9 w-9 items-center justify-center rounded-lg border border-border text-muted-foreground hover:text-foreground hover:border-primary/50 transition-colors"
              >
                <Code2 className="h-4 w-4" />
              </a>
            </div>
          </div>
        </div>

        <div className="mt-8 border-t border-border pt-6">
          <p className="text-center text-xs text-muted-foreground">
            © {currentYear} 楊軒羽 (Shen Yang). All rights reserved. Built with
            Next.js 16, React 19, Tailwind CSS v4 & Supabase.
          </p>
        </div>
      </div>
    </footer>
  );
}
