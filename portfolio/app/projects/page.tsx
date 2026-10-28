// 【關鍵技術 5】：GitHub REST API + ISR (Revalidation) — 使用 fetch 搭配 revalidate: 3600 實現增量靜態再生，每小時自動重新生成專案資料，兼顧即時性與效能

import { Star, GitFork, ExternalLink, AlertCircle, FolderOpen, Code2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardFooter, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

export type Repo = {
  id: number;
  name: string;
  description: string | null;
  html_url: string;
  homepage: string | null;
  stargazers_count: number;
  forks_count: number;
  language: string | null;
  topics: string[];
  updated_at: string;
  fork: boolean;
};

const mockRepos: Repo[] = [
  {
    id: 1,
    name: 'nextjs-16-portfolio',
    description:
      'Production-ready personal portfolio built with Next.js 16, React 19 RSC, Tailwind CSS v4, and Supabase.',
    html_url: 'https://github.com/octocat/nextjs-16-portfolio',
    homepage: null,
    stargazers_count: 248,
    forks_count: 32,
    language: 'TypeScript',
    topics: ['nextjs', 'react19', 'tailwindcss', 'supabase', 'portfolio'],
    updated_at: '2025-09-15T10:00:00Z',
    fork: false,
  },
  {
    id: 2,
    name: 'supabase-server-actions',
    description:
      'End-to-end type-safe data layer using Supabase PostgreSQL + Next.js Server Actions + Zod validation.',
    html_url: 'https://github.com/octocat/supabase-server-actions',
    homepage: null,
    stargazers_count: 187,
    forks_count: 21,
    language: 'TypeScript',
    topics: ['supabase', 'server-actions', 'zod', 'postgresql'],
    updated_at: '2025-09-10T08:00:00Z',
    fork: false,
  },
  {
    id: 3,
    name: 'tailwind-v4-design-system',
    description:
      'A comprehensive design system built on Tailwind CSS v4 CSS-first theme with OKLCH color space.',
    html_url: 'https://github.com/octocat/tailwind-v4-design-system',
    homepage: null,
    stargazers_count: 156,
    forks_count: 18,
    language: 'CSS',
    topics: ['tailwindcss', 'design-system', 'oklch', 'css'],
    updated_at: '2025-09-05T12:00:00Z',
    fork: false,
  },
  {
    id: 4,
    name: 'framer-motion-animations',
    description:
      'Reusable Framer Motion animation presets and micro-interaction components for React 19.',
    html_url: 'https://github.com/octocat/framer-motion-animations',
    homepage: null,
    stargazers_count: 134,
    forks_count: 15,
    language: 'TypeScript',
    topics: ['framer-motion', 'react', 'animations', 'micro-interactions'],
    updated_at: '2025-08-28T09:00:00Z',
    fork: false,
  },
  {
    id: 5,
    name: 'wcag-accessible-components',
    description:
      'WCAG 2.2 AA compliant React components with full keyboard navigation, ARIA, and focus management.',
    html_url: 'https://github.com/octocat/wcag-accessible-components',
    homepage: null,
    stargazers_count: 98,
    forks_count: 11,
    language: 'TypeScript',
    topics: ['wcag', 'accessibility', 'aria', 'react', 'a11y'],
    updated_at: '2025-08-20T14:00:00Z',
    fork: false,
  },
  {
    id: 6,
    name: 'react-hook-form-zod-schema',
    description:
      'Type-safe form validation toolkit combining React Hook Form and Zod for client + server validation.',
    html_url: 'https://github.com/octocat/react-hook-form-zod-schema',
    homepage: null,
    stargazers_count: 76,
    forks_count: 8,
    language: 'TypeScript',
    topics: ['react-hook-form', 'zod', 'validation', 'forms'],
    updated_at: '2025-08-15T10:00:00Z',
    fork: false,
  },
];

async function fetchRepos(): Promise<Repo[]> {
  try {
    const res = await fetch('https://api.github.com/users/shen-yang-tw/repos?sort=updated&per_page=6', { // ?sort=updated&per_page=6：「請把我帳號下『最近有更新過』的專案挑出來，而且依「最後更新時間」排序前『 6 個』就好，其餘的不用送過來。」

      // 【關鍵技術 5】：ISR revalidate: 3600 — 每小時重新生成一次，平衡資料新鮮度與靜態效能
      next: { revalidate: 3600 },
    });
    if (!res.ok) throw new Error('GitHub API unavailable');
    const data: Repo[] = await res.json();
    const filtered = data
      .filter((r) => !r.fork)
      .sort((a, b) => b.stargazers_count - a.stargazers_count)
      .slice(0, 6);
    if (filtered.length === 0) return mockRepos;
    return filtered;
  } catch {
    return mockRepos;
  }
}

export default async function ProjectsPage() {
  const repos = await fetchRepos();

  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute -top-20 right-10 h-72 w-72 rounded-full bg-primary/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit gap-1.5">
              <Code2 className="h-3 w-3" />
              Open Source
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              專案<span className="text-gradient-primary">作品</span>
            </h1>
            <small className="max-w-2xl text-muted-foreground">
              過去專案因保密協定無法公開展示，因此本網站主要展示個人專案與技術實作。
            </small>
            <p className="max-w-2xl text-lg text-muted-foreground">
              透過 GitHub REST API 即時拉取專案資料，使用 GitHub 狀態即時更新（On-Demand Revalidation），以及 ISR 每小時自動更新一次。
              點擊卡片前往原始碼。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {repos.map((repo) => (
            <Card
              key={repo.id}
              className="group flex flex-col border-border bg-card/50 transition-all hover:border-primary/30 hover:shadow-lg hover:-translate-y-0.5"
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                      <Code2 className="h-4 w-4" />
                    </div>
                    <h3 className="font-semibold leading-tight group-hover:text-primary transition-colors">
                      {repo.name}
                    </h3>
                  </div>
                  {repo.language && (
                    <Badge variant="outline" className="shrink-0">
                      {repo.language}
                    </Badge>
                  )}
                </div>
              </CardHeader>

              <CardContent className="flex-1">
                <p className="text-sm text-muted-foreground leading-relaxed line-clamp-3">
                  {repo.description || 'No description available.'}
                </p>
                {repo.topics && repo.topics.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1.5">
                    {repo.topics.slice(0, 4).map((topic) => (
                      <span
                        key={topic}
                        className="rounded border border-border bg-muted/50 px-2 py-0.5 text-[10px] font-medium text-muted-foreground"
                      >
                        {topic}
                      </span>
                    ))}
                  </div>
                )}
              </CardContent>

              <CardFooter className="flex items-center justify-between border-t border-border pt-4">
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span className="flex items-center gap-1">
                    <Star className="h-3.5 w-3.5" />
                    {repo.stargazers_count}
                  </span>
                  <span className="flex items-center gap-1">
                    <GitFork className="h-3.5 w-3.5" />
                    {repo.forks_count}
                  </span>
                </div>
                <Button asChild variant="ghost" size="sm" className="group/btn">
                  <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                    <ExternalLink className="mr-1.5 h-3.5 w-3.5 transition-transform group-hover/btn:translate-x-0.5" />
                    View
                  </a>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      </section>
    </div>
  );
}
