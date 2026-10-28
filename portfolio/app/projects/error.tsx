'use client';

import { AlertCircle, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function ProjectsError({
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-border">
        <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
            專案<span className="text-gradient-primary">作品</span>
          </h1>
        </div>
      </section>

      <section className="mx-auto flex max-w-7xl flex-col items-center px-4 py-24 sm:px-6 lg:px-8">
        <div className="flex h-16 w-16 items-center justify-center rounded-full bg-destructive/10 text-destructive">
          <AlertCircle className="h-8 w-8" />
        </div>
        <h2 className="mt-6 text-xl font-semibold">無法載入專案資料</h2>
        <p className="mt-2 text-sm text-muted-foreground">
          GitHub API 可能暫時無法存取，請稍後再試
        </p>
        <Button onClick={reset} className="mt-6" variant="outline">
          <RefreshCw className="mr-2 h-4 w-4" />
          重新載入
        </Button>
      </section>
    </div>
  );
}
