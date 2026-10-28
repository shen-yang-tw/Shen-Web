'use client';

import { motion } from 'framer-motion';
import { Briefcase, GraduationCap } from 'lucide-react';

const experiences = [
  {
    type: 'work',
    role: <>AI 應用工程師 <div>(AI Application & Full-Stack Engineer)</div></>,
    company: '獨立接案 / 個人技術工作室',
    period: '2026 — Present',
    description:
      '專注於將 Python 程式與生成式 AI 工具整合進網頁開發。透過串接大語言模型（LLM）API 來實現智慧型資料處理，並從無到有獨立規劃並開發兩個核心專案：包含網頁自動重構與改版系統、以及自動化資料搜集系統。全面追求利用現代化科技省下繁瑣的人工扣資料時間，落實高效且免加班的開發模式。',
    tags: ["Next.js 16", "React 19", "Tailwind v4", "TypeScript", "GitHub API 串接", "ISR 渲染策略", "Python 程式設計", "AI 網頁自動重構", "自動化資料搜集"],
  },
  {
    type: 'work',
    role: <>資深前端工程師 <div>(Senior Front-end Layout Engineer)</div></>,
    company: '中大型資訊開發公司（服務近 10 年，員工約 90 人）',
    period: '2017 — 2026',
    description:
      '於同一機構深耕服務近十年，展現極高之職業忠誠度與團隊信任。長期獨立主導大型系統與多項政府公部門專案之前端佈局（Layout）開發。精通 Bootstrap、Tailwind CSS 與 JavaScript 架構，完美在各種手機、平板與電腦上正常顯示。具備極強的自主為老舊專案導入新技術之實力，專注於高效常態工時交付，不需靠加班完成。',
    tags: ["Tailwind css", "Bootstrap", "政府大型專案", "RWD 響應式網頁", "JavaScript", "前端架構設計", "獨立專案交付"],
  },
  {
    type: 'work',
    role: <>資深網頁設計師  <div>(Senior UI Component & Design System Specialist)</div></>,
    company: '早期經歷：多間數位行銷與廣告出版公司',
    period: '1996 — 2017',
    description:
      '早期多年累積前端經驗，專門負責幫網站制定一套重複使用的網頁排版標準（Design System）。主要工作是把複雜的視覺畫面，變成乾淨、好懂又容易維護的網頁程式碼。這十年讓我學會怎麼自己一個人找出問題並解決，擁有很強的獨立作戰能力。',
    tags: ["Design System", "CSS 核心架構", "網頁佈局標準", "UI/UX 易用性分析", "語意化 HTML", "獨立專案交付"],
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
            15+ 年開發經驗，持續追求技術卓越
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
