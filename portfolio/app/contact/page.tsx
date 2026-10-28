import { Phone, Mail, MapPin, Clock, Send } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { ContactForm } from '@/components/site/contact-form';

export default function ContactPage() {
  return (
    <div className="relative">
      <section className="relative overflow-hidden border-b border-border">
        <div className="absolute inset-0 bg-grid-pattern opacity-[0.03]" />
        <div className="absolute -top-20 left-10 h-72 w-72 rounded-full bg-accent/10 blur-3xl" />
        <div className="relative mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
          <div className="flex flex-col gap-4">
            <Badge variant="secondary" className="w-fit gap-1.5">
              <Send className="h-3 w-3" />
              Get in Touch
            </Badge>
            <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
              聯絡<span className="text-gradient-primary">楊軒羽</span>
            </h1>
            <p className="max-w-2xl text-lg text-foreground">
              Let's Build AI Applications.
            </p>
            <p className="max-w-2xl text-lg text-muted-foreground">
              15+ 年開發經驗，專注於 AI / LLM、Python、React / Next.js 與 Automation。
            </p>
          </div>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-4 py-12 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 gap-8 lg:grid-cols-5">
          <div className="lg:col-span-2 space-y-4">
            <div className="rounded-xl border border-border bg-card/50 p-6">
              <h2 className="mb-4 font-semibold">聯絡資訊</h2>
              <div className="space-y-4">
                <a
                  href="tel:0958804023"
                  className="group flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary transition-all group-hover:scale-110">
                    <Phone className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">電話</p>
                    <p className="text-sm font-medium">0958804023</p>
                  </div>
                </a>
                <a
                  href="mailto:shen.yang.work.tw@gmail.com"
                  className="group flex items-center gap-3 rounded-lg p-2 -mx-2 transition-colors hover:bg-muted/50"
                >
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-accent/10 text-accent transition-all group-hover:scale-110">
                    <Mail className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">電子郵件</p>
                    <p className="text-sm font-medium">shen.yang.work.tw@gmail.com</p>
                  </div>
                </a>
                <div className="flex items-center gap-3 rounded-lg p-2 -mx-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-success/10 text-success">
                    <MapPin className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">所在地區</p>
                    <p className="text-sm font-medium">Taiwan · Remote-friendly</p>
                  </div>
                </div>
                <div className="flex items-center gap-3 rounded-lg p-2 -mx-2">
                  <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-warning/10 text-warning">
                    <Clock className="h-4 w-4" />
                  </div>
                  <div>
                    <p className="text-xs text-muted-foreground">回覆時間</p>
                    <p className="text-sm font-medium">通常在 24 小時內</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card/50 p-6">
              <h2 className="mb-3 font-semibold">目標類型</h2>
              <div className="flex flex-wrap gap-2">
                {[
                  // '前端架構',
                  // '全端開發',
                  // '技術諮詢',
                  // 'Code Review',
                  // '團隊培訓',
                  // '效能優化',
                  // '全職工作機會 (Full-time Roles) ',
                  // '技術專案合作 (Project Collaboration)',
                  // '企業技術顧問 (Technical Consulting) ',
                  // '網頁效能優化 (Performance Optimization)',
                  'AI Application Engineer',
                  'AI Engineer',
                  'AI Integration Engineer',
                  'AI Software Engineer',
                ].map((item) => (
                  <span
                    key={item}
                    className="rounded-md border border-border bg-muted/50 px-2.5 py-1 text-xs font-medium text-muted-foreground"
                  >
                    {item}
                  </span>
                ))}
              </div>
            </div>
          </div>

          <div className="lg:col-span-3">
            <ContactForm />
          </div>
        </div>
      </section>
    </div>
  );
}
