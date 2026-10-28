'use client';

import { motion } from 'framer-motion';
import { Phone, Mail, ArrowDown, MapPin } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

// 【關鍵技術 10】：Framer Motion 聲明式微互動動畫 — 使用 motion 元件宣告式定義進場動畫、懸停效果與滾動觸發動畫，實現流暢的微互動體驗

export function HeroSection() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
      <div className="absolute inset-0 bg-linear-to-b from-transparent via-transparent to-background" />
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 h-96 w-150 rounded-full bg-primary/10 blur-3xl" />
      <div className="absolute top-20 right-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />

      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8 lg:py-28">
        <div className="grid grid-cols-1 items-center gap-12 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, ease: 'easeOut' }}
            className="flex flex-col gap-6"
          >
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.5 }}
            >
              <Badge variant="secondary" className="gap-1.5 py-1.5">
                <span className="relative flex h-2 w-2">
                  <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-success opacity-75" />
                  <span className="relative inline-flex h-2 w-2 rounded-full bg-success" />
                </span>
                AI / LLM · Python · React · Next.js · TypeScript · Automation
              </Badge>
            </motion.div>

            <div className="space-y-4">
              <motion.h1
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.6 }}
                className="text-4xl font-bold leading-tight tracking-tight sm:text-5xl lg:text-6xl"
              >
                你好，我是{' '}
                <span className="text-gradient-primary animate-gradient-shift">
                  楊軒羽
                </span>
                {/* <span className="block text-gradient-primary animate-gradient-shift">
                  AI Application Engineer
                </span> */}
              </motion.h1>

              <motion.p
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.35, duration: 0.6 }}
                className="text-lg text-muted-foreground sm:text-xl"
              >
                15+ 年開發經驗，核心能力是將 AI + Web + Automation 整合成實際可使用的 Application的{' '}
                <span className="font-semibold text-foreground">Senior 工程師</span>
              </motion.p>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5, duration: 0.6 }}
                className="flex flex-wrap gap-2"
              >
                <span className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground">
                Core Skills</span>
                {/* ['Python', 'GitHub API', 'AI Web Refactoring', 'Automated Data Scraping', 'React 19', 'Next.js 16', 'TypeScript', 'ISR', 'Supabase', 'Tailwind v4', 'ShadCN UI', 'Framer Motion', 'Web Accessibility (a11y)'] */}
                {['AI / LLM · Python · React · Next.js · TypeScript · Automation'].map(
                  (tech) => (
                    <Badge key={tech} variant="outline" className="py-1.5">
                      {tech}
                    </Badge>
                  )
                )}
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.65, duration: 0.6 }}
                className="flex flex-wrap gap-3 pt-2"
              >
                <Button asChild size="lg" className="group">
                  <a href="tel:0958804023">
                    <Phone className="mr-2 h-4 w-4" />
                    0958804023
                  </a>
                </Button>
                <Button asChild variant="outline" size="lg" className="group">
                  <a href="mailto:shen.yang.work.tw@gmail.com">
                    <Mail className="mr-2 h-4 w-4" />
                    shen.yang.work.tw@gmail.com
                  </a>
                </Button>
              </motion.div>

              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.6 }}
                className="flex items-center gap-2 pt-2 text-sm text-muted-foreground"
              >
                <MapPin className="h-4 w-4" />
                Taiwan · Remote-friendly
              </motion.div>
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3, duration: 0.7, ease: 'easeOut' }}
            className="relative flex justify-center lg:justify-end"
          >
            <div className="relative">
              <div className="absolute -inset-4 rounded-full bg-linear-to-tr from-primary/20 via-accent/20 to-primary/20 blur-2xl animate-glow-pulse" />
              <div className="relative h-64 w-64 sm:h-80 sm:w-80 overflow-hidden rounded-full ring-4 ring-primary/30 shadow-2xl neon-glow">
                <img
                  src="/JSface.jpg"
                  alt="楊軒羽 Shen Yang 頭像"
                  className="h-full w-full object-cover"
                />
                <div className="absolute inset-0 rounded-full bg-linear-to-tr from-primary/10 via-transparent to-accent/10" />
              </div>

              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1, duration: 0.5 }}
                className="absolute -bottom-4 -left-4 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-4 py-3 shadow-lg backdrop-blur"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <span className="text-sm font-bold">SY</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold">Senior Engineer</p>
                  <p className="text-[10px] text-muted-foreground">15+ years experience</p>
                </div>
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.1, duration: 0.5 }}
                className="absolute -top-2 -right-2 flex items-center gap-2 rounded-xl border border-border bg-card/90 px-4 py-3 shadow-lg backdrop-blur"
              >
                <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent/10 text-accent">
                  <span className="text-sm font-bold">FT</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-semibold">AI Application</p>
                  <p className="text-[10px] text-muted-foreground">Front-to-End Development</p>
                </div>
              </motion.div>
            </div>
          </motion.div>
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.5, duration: 0.8 }}
          className="mt-16 flex justify-center"
        >
          <Link
            href="/projects"
            className="flex flex-col items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            aria-label="瀏覽專案"
          >
            <span className="text-xs">瀏覽專案</span>
            <ArrowDown className="h-4 w-4 animate-bounce" />
          </Link>
        </motion.div>
      </div>
    </section>
  );
}
