'use client';

import { motion } from 'framer-motion';
import { Briefcase, GraduationCap } from 'lucide-react';

const experiences = [
  {
    type: 'work',
    role: 'Senior Frontend Engineer',
    company: 'Tech Corp',
    period: '2023 — Present',
    description:
      '主導前端架構升級至 Next.js 16 + React 19 Server Components，首屏載入效能提升 60%。建立設計系統與元件庫，提升團隊開發效率。',
    tags: ['Next.js 16', 'React 19', 'RSC', 'Tailwind v4'],
  },
  {
    type: 'work',
    role: 'Full-Stack Engineer',
    company: 'Startup Studio',
    period: '2021 — 2023',
    description:
      '從零到一構建多個 SaaS 產品，使用 Supabase + PostgreSQL 作為後端，實現 Server Actions 端到端型別安全架構。',
    tags: ['Supabase', 'Server Actions', 'TypeScript', 'PostgreSQL'],
  },
  {
    type: 'work',
    role: 'Frontend Developer',
    company: 'Digital Agency',
    period: '2019 — 2021',
    description:
      '負責多個大型品牌網站開發，導入 Component-Driven 開發流程與自動化測試，程式覆蓋率提升至 85%。',
    tags: ['React', 'Vue', 'Jest', 'Cypress'],
  },
  {
    type: 'education',
    role: 'B.S. Computer Science',
    company: 'National University',
    period: '2015 — 2019',
    description:
      '主修計算機科學，專注於 Web 技術、演算法與軟體工程。參與 ACM 競程競賽，獲得區域賽銀牌。',
    tags: ['Algorithms', 'Data Structures', 'Web'],
  },
];

export function ExperienceTimeline() {
  return (
    <section className="relative border-t border-border bg-background">
      <div className="mx-auto max-w-4xl px-4 py-20 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: '-100px' }}
          transition={{ duration: 0.5 }}
          className="mb-12 text-center"
        >
          <h2 className="text-3xl font-bold tracking-tight sm:text-4xl">
            經歷<span className="text-gradient-primary">時間軸</span>
          </h2>
          <p className="mt-3 text-muted-foreground">
            5+ 年全端開發經驗，持續追求技術卓越
          </p>
        </motion.div>

        <div className="relative">
          <div className="absolute left-4 top-0 bottom-0 w-px bg-gradient-to-b from-primary/50 via-border to-transparent sm:left-1/2 sm:-translate-x-1/2" />

          {experiences.map((exp, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: i % 2 === 0 ? -30 : 30 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: '-50px' }}
              transition={{ duration: 0.5, delay: i * 0.1 }}
              className={`relative mb-8 flex gap-6 sm:gap-8 ${
                i % 2 === 0 ? 'sm:flex-row' : 'sm:flex-row-reverse'
              }`}
            >
              <div className="absolute left-4 top-2 z-10 flex h-8 w-8 -translate-x-1/2 items-center justify-center rounded-full border-2 border-primary bg-background sm:left-1/2">
                {exp.type === 'work' ? (
                  <Briefcase className="h-3.5 w-3.5 text-primary" />
                ) : (
                  <GraduationCap className="h-3.5 w-3.5 text-primary" />
                )}
              </div>

              <div className="ml-12 flex-1 sm:ml-0 sm:w-1/2 sm:px-6">
                <div className="rounded-xl border border-border bg-card/50 p-5 transition-all hover:border-primary/30 hover:shadow-md">
                  <span className="text-xs font-medium text-primary">
                    {exp.period}
                  </span>
                  <h3 className="mt-1 font-semibold">{exp.role}</h3>
                  <p className="text-sm text-muted-foreground">{exp.company}</p>
                  <p className="mt-2 text-sm text-muted-foreground leading-relaxed">
                    {exp.description}
                  </p>
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {exp.tags.map((tag) => (
                      <span
                        key={tag}
                        className="rounded border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>

              <div className="hidden sm:block sm:w-1/2" />
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
