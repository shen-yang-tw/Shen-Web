'use server';
// 需要 'use server'是因為它的 submitContactForm 會被 contact-form.tsx 這個 Client Component 匯入並呼叫

// 【關鍵技術 2】：React 19 Server Actions ('use server') — 使用 Server Action 在伺服器端執行資料變更，無需建立 API 端點，直接從前端元件呼叫

import { z } from 'zod';
import { supabase } from '@/lib/supabase';
import { resend } from '@/lib/resend';

export type ContactState = {
  success: boolean;
  message: string;
  errors?: {
    name?: string[];
    email?: string[];
    phone?: string[];
    message?: string[];
  };
};

const contactSchema = z.object({
  name: z
    .string()
    .min(2, '姓名至少需要 2 個字元')
    .max(50, '姓名不可超過 50 個字元'),
  email: z
    .string()
    .min(1, '電子郵件為必填欄位')
    .pipe(z.email({ error: '請輸入有效的電子郵件地址' })),
  phone: z
    .string()
    .max(20, '電話號碼不可超過 20 個字元')
    .optional()
    .or(z.literal('')),
  message: z
    .string()
    .min(10, '訊息至少需要 10 個字元')
    .max(2000, '訊息不可超過 2000 個字元'),
});

function buildEmailHtml(data: {
  name: string;
  email: string;
  phone: string;
  message: string;
}): string {
  const timestamp = new Date().toLocaleString('zh-TW', {
    timeZone: 'Asia/Taipei',
  });
  return `
<!DOCTYPE html>
<html lang="zh-TW">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0;padding:0;background-color:#f4f5f7;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,'Noto Sans TC',sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="padding:32px 0;">
    <tr>
      <td align="center">
        <table width="600" cellpadding="0" cellspacing="0" style="background-color:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 1px 3px rgba(0,0,0,0.08);">
          <tr>
            <td style="background:linear-gradient(135deg,#4f46e5,#0ea5e9);padding:32px 40px;">
              <h1 style="margin:0;color:#ffffff;font-size:22px;font-weight:700;">新的聯絡表單訊息</h1>
              <p style="margin:8px 0 0;color:rgba(255,255,255,0.85);font-size:14px;">來自您的個人作品集網站</p>
            </td>
          </tr>
          <tr>
            <td style="padding:32px 40px;">
              <table width="100%" cellpadding="0" cellspacing="0">
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">姓名</p>
                    <p style="margin:0;font-size:16px;color:#111827;font-weight:600;">${data.name}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">電子郵件</p>
                    <p style="margin:0;font-size:16px;color:#4f46e5;font-weight:500;">${data.email}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:20px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">電話</p>
                    <p style="margin:0;font-size:16px;color:#111827;font-weight:500;">${data.phone || '未提供'}</p>
                  </td>
                </tr>
                <tr>
                  <td style="padding-bottom:8px;">
                    <p style="margin:0 0 4px;font-size:12px;color:#6b7280;text-transform:uppercase;letter-spacing:0.05em;">訊息內容</p>
                    <div style="background-color:#f9fafb;border:1px solid #e5e7eb;border-radius:8px;padding:16px;margin-top:8px;">
                      <p style="margin:0;font-size:15px;color:#374151;line-height:1.6;white-space:pre-wrap;">${data.message}</p>
                    </div>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
          <tr>
            <td style="background-color:#f9fafb;padding:20px 40px;border-top:1px solid #e5e7eb;">
              <p style="margin:0;font-size:13px;color:#6b7280;">送出時間：${timestamp}</p>
              <p style="margin:4px 0 0;font-size:13px;color:#6b7280;">此郵件由楊軒羽個人作品集網站自動寄發</p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>
  `.trim();
}

export async function submitContactForm(
  prevState: ContactState,
  formData: FormData
): Promise<ContactState> {
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return {
      success: false,
      message: '尚未設定 Supabase 環境變數，請聯絡網站管理員。',
    };
  }

  const raw = {
    name: (formData.get('name') as string)?.trim() ?? '',
    email: (formData.get('email') as string)?.trim() ?? '',
    phone: (formData.get('phone') as string)?.trim() ?? '',
    message: (formData.get('message') as string)?.trim() ?? '',
  };

  const parsed = contactSchema.safeParse(raw);

  if (!parsed.success) {
    const fieldErrors = z.flattenError(parsed.error).fieldErrors;
    return {
      success: false,
      message: '請修正表單中的錯誤',
      errors: {
        name: fieldErrors.name,
        email: fieldErrors.email,
        phone: fieldErrors.phone,
        message: fieldErrors.message,
      },
    };
  }

  // 【關鍵技術 3】：Supabase DB 實體寫入 + Resend Email 信件自動通知 — 工作流 1：將驗證後的聯絡訊息插入 Supabase PostgreSQL 資料表，實現無伺服器雲端資料庫持久化
  const { error: dbError } = await supabase.from('contact_messages').insert({
    name: parsed.data.name,
    email: parsed.data.email,
    phone: parsed.data.phone || null,
    message: parsed.data.message,
  });

  if (dbError) {
    console.error('Supabase contact message insert failed:', {
      code: dbError.code,
      message: dbError.message,
      details: dbError.details,
      hint: dbError.hint,
    });
    return {
      success: false,
      message: '系統發生錯誤，請稍後再試或直接發送電子郵件',
    };
  }

  // 【關鍵技術 3】：Supabase DB 實體寫入 + Resend Email 信件自動通知 — 工作流 2：調用 Resend API 寄送排版好的 HTML 通知信件至站長信箱
  if (resend) {
    const { error: emailError } = await resend.emails.send({
      from: 'Portfolio Contact <onboarding@resend.dev>',
      to: 'shen.yang.work.tw@gmail.com',
      subject: `新的聯絡訊息 — 來自 ${parsed.data.name}`,
      html: buildEmailHtml({
        name: parsed.data.name,
        email: parsed.data.email,
        phone: parsed.data.phone || '',
        message: parsed.data.message,
      }),
    });

    if (emailError) {
      console.error('Resend email failed:', emailError);
    }
  }

  return {
    success: true,
    message: '感謝您的訊息！楊軒羽會盡快回覆您。',
  };
}
