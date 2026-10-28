// 【關鍵技術 1】：Next.js 16+ (App Router & RSC) — 使用 React Server Component 渲染首頁，實現 0 KB JavaScript 初始載入，提升 SEO 與首屏效能

import { Cpu, AppWindow, CheckCircle, Phone, Mail, ArrowRight, Code2, Zap, Layers, Database, Globe, Sparkles } from 'lucide-react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { HeroSection } from '@/components/site/hero-section';
import { SkillsSection } from '@/components/site/skills-section';
import { ExperienceTimeline } from '@/components/site/experience-timeline';
import { StatsSection } from '@/components/site/stats-section';

const techStack = [
  { name: 'React 19', icon: Code2 },
  { name: 'Next.js 16', icon: Layers },
  { name: 'TypeScript', icon: Sparkles },
  { name: 'Tailwind CSS v4', icon: Zap },
  { name: 'Supabase', icon: Database },
  { name: 'PostgreSQL', icon: Database },
];

const highlights = [
  {
    title: "AI 工具整合",
    description: "善用 Python 與 AI API 等智慧工具鏈，把 AI 大腦直接裝進網頁中，用自動化流程幫專案大幅省下繁瑣的人工作業時間。",
    icon: Cpu,
  },
    {
    title: "高效全端架構",
    description: "熟練運用最新 Next.js 16 與 React 19 架構，以及Server Actions + Serverless Database技術，並利用網頁動態讀取與效能優化技術，打造出載入速度極快、操作流暢的網站。",
    icon: AppWindow,
  },
  {
    title: "現代化 Web 開發",
    description: "擁有將近十年的精準切版底子，精通 Tailwind v4 、shadcn/ui、Framer Motion 與 RWD 響應式佈局，並能嚴格確保網站百分之百通過國家級無障礙規範檢測。",
    icon: Globe,
  }
];

// const highlights = [
//   {
//     title: "AI Application & Automation",
//     description: "將 Python、LLM API 與 Web Application 結合，建立實際可使用的 AI 應用與自動化流程。目前已獨立開發網頁自動重構與自動化資料搜集相關系統，將 AI 從單純的聊天工具轉化為實際的工程生產力。",
//     icon: Cpu,
//   },
//     {
//     title: "Modern Full-Stack Architecture",
//     description: "使用 Next.js 16、React 19、TypeScript、Server Components、Server Actions、Supabase 與 PostgreSQL 建立完整 Web Application。能處理從前端 UI、資料處理、API、Database 到 Deployment 的完整開發流程，並依照需求進行 Server / Client 架構切分與效能最佳化。",
//     icon: AppWindow,
//   },
//   {
//     title: "Enterprise Frontend Engineering",
//     description: "擁有長期企業與政府大型專案開發經驗，熟悉 RWD、Design System、Reusable Components、Accessibility 與 Legacy System Modernization。除了實作 UI，也重視程式碼的可讀性、可維護性、跨裝置相容性與長期開發效率。",
//     icon: Globe,
//   }
// ];

export default function HomePage() {
  return (
    <div className="relative">
      <HeroSection />

      <section className="relative border-t border-border bg-background">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
            {highlights.map((item, i) => (
              <Card
                key={item.title}
                className="group relative overflow-hidden border-border bg-card/50 transition-all hover:border-primary/30 hover:shadow-lg"
              >
                <CardContent className="p-6">
                  <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary/20">
                    <item.icon className="h-6 w-6" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold">{item.title}</h3>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    {item.description}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <StatsSection />
      <SkillsSection />
      <ExperienceTimeline />

      <section className="relative border-t border-border bg-card/30">
        <div className="mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center gap-6 text-center">
            <div>
              <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
                讓我們一起打造
                <span className="text-gradient-primary">AI自動化產品</span>
              </h2>
              <p className="mt-3 max-w-xl text-muted-foreground">
                無論是前端架構優化、全端開發、AI自動化技術，歡迎隨時聯絡
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="group">
                <Link href="/contact">
                  開始合作
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="tel:0958804023">
                  <Phone className="mr-2 h-4 w-4" />
                  0958804023
                </a>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href="mailto:shen.yang.work.tw@gmail.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
