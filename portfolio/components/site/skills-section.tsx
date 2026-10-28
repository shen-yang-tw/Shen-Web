'use client';

import { motion } from 'framer-motion';
import { Card, CardContent } from '@/components/ui/card';
import { Cpu, AppWindow, CheckCircle, Settings } from 'lucide-react';

// const skillCategories = [
//   {
//     title: "AI 應用與自動化",
//     description: "專注於利用大語言模型 API 建立自動化工具，提升工作效率並免除無效的傳統人工處理時間。",
//     icon: Cpu,
//     skills: ["Python 程式設計", "AI / LLM API 串接", "AI 提示詞工程", "網頁自動化爬蟲"]
//   },
//   {
//     title: "現代化Web技術",
//     description: "熟練運用當前最新、最高效能的前端架構，並嚴格確保系統通過國家級無障礙檢測，以及最新部署技術。",
//     icon: AppWindow,
//     skills: ["Next.js 16", "React 19", "TypeScript", "ISR 渲染策略", "Zod 資料欄位驗證", "Server Actions", "Supabase", "PostgreSQL", "RSC", "Tailwind v4", "shadcn/ui", "Framer Motion"]
//   },
//   {
//     title: "工程協作工具",
//     description: "具備中大型資訊機構長期協作的工程規範，能高效維護高品質、好懂的網頁程式碼。",
//     icon: Settings,
//     skills: ["Git / GitHub 虛擬庫管理", "GitHub REST API 整合", "NPM 套件管理工具", 'Vercel', 'Netlify', 'Docker', 'CI/CD 自動化部署']
//   }
// ];

const skillCategories = [
  {
    title: "AI 應用與自動化",
    description: "專注於利用大語言模型 API 建立自動化工具，提升工作效率並免除無效的傳統人工處理時間。",
    icon: Cpu,
    skills: ["Python 程式設計", "AI / LLM API 串接", "AI 提示詞工程", "網頁自動化爬蟲"]
  },
  {
    title: "現代化全端技術",
    description: "熟練運用當前最新、最高效能的前端架構，並嚴格確保系統通過國家級無障礙檢測，以及最新部署技術。",
    icon: AppWindow,
    skills: ["Next.js 16", "React 19", "TypeScript", "ISR 渲染策略", "Zod 資料欄位驗證", "Server Actions", "Supabase", "PostgreSQL", "RSC", "Tailwind v4", "shadcn/ui", "Framer Motion"]
  },
  {
    title: "工程協作工具",
    description: "具備中大型資訊機構長期協作的工程規範，能高效維護高品質、好懂的網頁程式碼。",
    icon: Settings,
    skills: ["Git / GitHub 虛擬庫管理", "GitHub REST API 整合", "NPM 套件管理工具", 'Vercel', 'Netlify', 'Docker', 'CI/CD 自動化部署']
  }
];

export function SkillsSection() {
  return (
    <section className="relative border-t border-border bg-card/30">
      <div className="absolute inset-0 bg-dot-pattern opacity-[0.02]" />
      <div className="relative mx-auto max-w-7xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            技術<span className="text-gradient-primary">棧</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            橫跨前端、後端到AI整合及自動化部署的完整技術能力
          </p>
        </motion.div>

        <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {skillCategories.map((category, i) => (
            <motion.div
              key={category.title}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.08 }}
            >
              <Card className="group h-full border-border bg-card/50 transition-all hover:border-primary/30 hover:shadow-lg">
                <CardContent className="p-6">
                  <div className="mb-4 flex flex-wrap items-center gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:scale-110 group-hover:bg-primary/20">
                      <category.icon className="h-5 w-5" />
                    </div>
                    <h3 className="font-semibold flex-1">{category.title}</h3>
                    <p className="text-sm text-muted-foreground leading-relaxed mt-2">
                      {category.description}
                    </p>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    {category.skills.map((skill) => (
                      <span
                        key={skill}
                        className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground transition-colors hover:border-primary/30 hover:text-foreground"
                      >
                        {skill}
                      </span>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
