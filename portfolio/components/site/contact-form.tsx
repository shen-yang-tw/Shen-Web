'use client';

// 【關鍵技術 7】：React Hook Form + Zod 雙重驗證 — 前端使用 React Hook Form 進行即時驗證，後端透過 Server Action Zod schema 進行二次驗證，確保資料完整性

import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useTransition, useEffect, useState, useRef } from 'react';
import { Send, CheckCircle2, AlertCircle, Loader2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { submitContactForm, type ContactState } from '@/app/actions/contact';

// 【關鍵技術 8】：Web Storage API (LocalStorage Auto-Draft) — 使用 debounce 將表單輸入自動儲存至 LocalStorage，防止意外關閉頁面導致資料遺失

const contactSchema = z.object({
  name: z
    .string()
    .min(2, '姓名至少需要 2 個字元')
    .max(50, '姓名不可超過 50 個字元'),
  email: z
    .string()
    .min(1, '電子郵件為必填欄位')
    .pipe(z.email({ error: '請輸入有效的電子郵件地址' })),
  // phone: z
  //   .string()
  //   .max(20, '電話號碼不可超過 20 個字元')
  //   .optional()
  //   .or(z.literal('')),
  phone: z
    .string()
    .max(20, '電話號碼不可超過 20 個字元')
    .optional()
    .or(z.literal(''))
    .refine((val) => {
      // 因為電話是選填，如果使用者完全沒輸入（空字串），直接放行通過
      if (!val) return true;
      // 檢查是否符合台灣的手機（09xxxxxxxx）或常見市話格式
      const taiwanPhoneRegex = /^(09\d{8}|0\d{1,2}-?\d{6,8})$/;
      return taiwanPhoneRegex.test(val);
    }, {
      message: '請輸入有效的台灣手機或市話號碼', // 格式亂填時跳出的白話錯誤訊息
    }),
  message: z
    .string()
    .min(10, '訊息至少需要 10 個字元')
    .max(2000, '訊息不可超過 2000 個字元'),
});

type ContactFormValues = z.infer<typeof contactSchema>;

const DRAFT_KEY = 'contact-form-draft';

export function ContactForm() {
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<ContactState>({ success: false, message: '' });
  const { toast } = useToast();
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [hasDraft, setHasDraft] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm<ContactFormValues>({
    resolver: zodResolver(contactSchema),
    defaultValues: {
      name: '',
      email: '',
      phone: '',
      message: '',
    },
  });

  const onInvalid = () => {
    toast({
      variant: 'destructive',
      title: '請檢查表單內容',
      description: '請修正標示的欄位後再送出。',
    });
  };

  // 【關鍵技術 8】：Debounced LocalStorage auto-draft — 監聽表單值變化，debounce 500ms 後寫入 LocalStorage
  const watchedValues = watch();

  useEffect(() => {
    try {
      const saved = localStorage.getItem(DRAFT_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.name || parsed.email || parsed.message) {
          setHasDraft(true);
        }
      }
    } catch {
      // ignore
    }
  }, []);

  useEffect(() => {
    const subscription = watch((values) => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        const hasContent = values.name || values.email || values.message;
        if (hasContent) {
          localStorage.setItem(DRAFT_KEY, JSON.stringify(values));
          setHasDraft(true);
        }
      }, 500);
    });
    return () => {
      subscription.unsubscribe();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [watch]);

  const onSubmit = (data: ContactFormValues) => {
    const formData = new FormData();
    formData.append('name', data.name);
    formData.append('email', data.email);
    formData.append('phone', data.phone || '');
    formData.append('message', data.message);

    startTransition(async () => {
      try {
        const result = await submitContactForm(state, formData);
        setState(result);

        if (result.success) {
          toast({
            title: '訊息已送出',
            description: result.message,
          });
          reset();
          localStorage.removeItem(DRAFT_KEY);
          setHasDraft(false);
        } else {
          toast({
            variant: 'destructive',
            title: result.errors ? '提交失敗' : '系統錯誤',
            description: result.message,
          });
        }
      } catch {
        const message = '送出失敗，請確認伺服器環境變數與網路連線。';
        setState({ success: false, message });
        toast({
          variant: 'destructive',
          title: '系統錯誤',
          description: message,
        });
      }
    });
  };

  const clearDraft = () => {
    localStorage.removeItem(DRAFT_KEY);
    reset();
    setHasDraft(false);
  };

  return (
    <form
      onSubmit={handleSubmit(onSubmit, onInvalid)}
      className="space-y-5 rounded-xl border border-border bg-card/50 p-6"
      // 【關鍵技術 9】：WCAG 2.2 AA Accessibility (a11y) — 表單提供完整 aria-label、錯誤訊息關聯與鍵盤導航支援
      aria-label="聯絡表單"
    >
      <div className="flex items-center justify-between">
        <h2 className="font-semibold">發送訊息</h2>
        {hasDraft && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={clearDraft}
            className="h-7 text-xs text-muted-foreground"
            aria-label="清除草稿"
          >
            <Trash2 className="mr-1 h-3 w-3" />
            清除草稿
          </Button>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="name">
          姓名 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          {...register('name')}
          placeholder="您的姓名"
          aria-invalid={!!errors.name}
          aria-describedby={errors.name ? 'name-error' : undefined}
          className={errors.name ? 'border-destructive' : ''}
        />
        {errors.name && (
          <p id="name-error" className="text-xs text-destructive" role="alert">
            {errors.name.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="email">
          電子郵件 <span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          {...register('email')}
          placeholder="your@email.com"
          aria-invalid={!!errors.email}
          aria-describedby={errors.email ? 'email-error' : undefined}
          className={errors.email ? 'border-destructive' : ''}
        />
        {errors.email && (
          <p id="email-error" className="text-xs text-destructive" role="alert">
            {errors.email.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="phone">電話 (選填)</Label>
        <Input
          id="phone"
          type="tel"
          {...register('phone')}
          placeholder="09xx-xxx-xxx"
          aria-invalid={!!errors.phone}
          aria-describedby={errors.phone ? 'phone-error' : undefined}
          className={errors.phone ? 'border-destructive' : ''}
        />
        {errors.phone && (
          <p id="phone-error" className="text-xs text-destructive" role="alert">
            {errors.phone.message}
          </p>
        )}
      </div>

      <div className="flex flex-col gap-2">
        <Label htmlFor="message">
          訊息 <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="message"
          {...register('message')}
          placeholder="請描述您的需求或問題..."
          rows={5}
          aria-invalid={!!errors.message}
          aria-describedby={errors.message ? 'message-error' : undefined}
          className={errors.message ? 'border-destructive' : ''}
        />
        {errors.message && (
          <p id="message-error" className="text-xs text-destructive" role="alert">
            {errors.message.message}
          </p>
        )}
        <p className="text-right text-xs text-muted-foreground">
          {(watchedValues.message || '').length} / 2000
        </p>
      </div>

      {state.success && (
        <div className="flex items-center gap-2 rounded-lg border border-success/30 bg-success/10 p-3 text-sm text-success">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      {state.message && !state.success && state.errors && (
        <div className="flex items-center gap-2 rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 shrink-0" />
          {state.message}
        </div>
      )}

      <Button
        type="submit"
        disabled={isPending}
        className="w-full"
        size="lg"
        aria-label="送出聯絡表單"
      >
        {isPending ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            送出中...
          </>
        ) : (
          <>
            <Send className="mr-2 h-4 w-4" />
            送出訊息
          </>
        )}
      </Button>

      <p className="text-center text-xs text-muted-foreground">
        您的訊息將透過 Server Action 安全送出，同時儲存至 Supabase 資料庫並寄發 Email 通知
      </p>
    </form>
  );
}
