'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';
import { Menu, X, Phone, Mail, Sun, Moon } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useThemeContext } from '@/components/site/theme-provider';
import { Button } from '@/components/ui/button';

const navLinks = [
  { href: '/', label: '首頁', labelEn: 'Home' },
  { href: '/projects', label: '專案', labelEn: 'Projects' },
  { href: '/contact', label: '聯絡', labelEn: 'Contact' },
];

export function Navbar() {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [scrolled, setScrolled] = useState(false);
  const { theme, toggleTheme } = useThemeContext();

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20);
    window.addEventListener('scroll', onScroll);
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  return (
    <header
      className={cn(
        'sticky top-0 z-50 w-full transition-all duration-300',
        scrolled
          ? 'border-b border-border bg-background/80 backdrop-blur-xl shadow-sm'
          : 'border-b border-transparent bg-transparent'
      )}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6 lg:px-8">
        <Link href="/" className="flex items-center gap-3 group" aria-label="回首頁">
          <div className="relative h-10 w-10 overflow-hidden rounded-lg ring-2 ring-primary/30 transition-all group-hover:ring-primary/60 group-hover:shadow-(--neon-glow)">
            <img
              src="/JSface.jpg"
              alt="楊軒羽 logo"
              className="h-full w-full object-cover"
            />
          </div>
          <div className="flex flex-col leading-tight">
            <span className="text-sm font-bold tracking-tight">楊軒羽</span>
            <span className="text-[10px] text-muted-foreground">Shen Yang</span>
          </div>
        </Link>

        <div className="hidden items-center gap-1 md:flex">
          {navLinks.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                'relative rounded-md px-4 py-2 text-sm font-medium transition-colors',
                pathname === link.href
                  ? 'text-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {link.label}
              {pathname === link.href && (
                <span className="absolute inset-x-3 -bottom-px h-0.5 rounded-full bg-primary" />
              )}
            </Link>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={toggleTheme}
            aria-label={theme === 'dark' ? '切換至亮色模式' : '切換至暗色模式'}
            className="h-9 w-9"
          >
            {theme === 'dark' ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <div className="hidden md:flex items-center gap-2">
            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <a href="tel:0958804023" aria-label="打電話給楊軒羽">
                <Phone className="h-4 w-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="icon" className="h-9 w-9">
              <a href="mailto:shen.yang.work.tw@gmail.com" aria-label="寄信給楊軒羽">
                <Mail className="h-4 w-4" />
              </a>
            </Button>
          </div>

          <Button
            variant="ghost"
            size="icon"
            className="md:hidden h-9 w-9"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="開啟選單"
            aria-expanded={mobileOpen}
          >
            {mobileOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </Button>
        </div>
      </nav>

      {mobileOpen && (
        <div className="md:hidden border-t border-border bg-background/95 backdrop-blur-xl">
          <div className="flex flex-col gap-1 px-4 py-4">
            {navLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                onClick={() => setMobileOpen(false)}
                className={cn(
                  'rounded-md px-4 py-2.5 text-sm font-medium transition-colors',
                  pathname === link.href
                    ? 'bg-primary/10 text-foreground'
                    : 'text-muted-foreground hover:bg-muted hover:text-foreground'
                )}
              >
                {link.label}
              </Link>
            ))}
            <div className="flex gap-2 pt-2">
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a href="tel:0958804023">
                  <Phone className="mr-2 h-4 w-4" />
                  電話
                </a>
              </Button>
              <Button asChild variant="outline" size="sm" className="flex-1">
                <a href="mailto:shen.yang.work.tw@gmail.com">
                  <Mail className="mr-2 h-4 w-4" />
                  Email
                </a>
              </Button>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
