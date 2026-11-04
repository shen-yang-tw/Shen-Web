// frontend/lib/authErrors.ts
// 登入、註冊、重設密碼、修改密碼的輸入驗證與 Supabase 錯誤對應。每個流程只會得到該流程專屬的錯誤文字。

import { isAuthRetryableFetchError } from '@supabase/supabase-js';
import type { MessageKey } from '@/lib/i18n';

export type ErrorKey = Extract<MessageKey, `auth.${string}`>;
export type MappedError = { key: ErrorKey; code: string | null; rateLimited?: boolean };

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PASSWORD_MAX = 72;
const PASSWORD_MIN = 8;

export function validateEmail(value: string): ErrorKey | null {
  const email = value.trim();
  if (!email) return 'auth.error.emailRequired';
  if (email.length > 254 || !EMAIL_RE.test(email)) return 'auth.error.emailFormat';
  return null;
}

// 登入只檢查是否有輸入，真正的密碼是否正確由伺服器判斷，避免洩漏密碼規則
export function validateSignInPassword(value: string): ErrorKey | null {
  return value ? null : 'auth.error.passwordRequired';
}

// 註冊與修改密碼使用的密碼強度規則
export function validateNewPassword(value: string): ErrorKey | null {
  if (!value) return 'auth.error.passwordRequired';
  if (value.length < PASSWORD_MIN) return 'auth.error.passwordTooShort';
  if (value.length > PASSWORD_MAX) return 'auth.error.passwordTooLong';
  if (!/[A-Za-z]/.test(value) || !/\d/.test(value)) return 'auth.error.passwordComplexity';
  return null;
}

export function validateConfirm(password: string, confirm: string): ErrorKey | null {
  if (!confirm) return 'auth.error.confirmRequired';
  if (password !== confirm) return 'auth.error.confirmMismatch';
  return null;
}

function errorCode(error: unknown): string | null {
  return typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
    ? error.code.toLowerCase()
    : null;
}

function isNetwork(error: unknown): boolean {
  return isAuthRetryableFetchError(error) || error instanceof TypeError;
}

function unknown(error: unknown, code: string | null): MappedError {
  if (error instanceof Error && error.message.includes('缺少環境變數')) {
    return { key: 'auth.configurationError', code: null };
  }
  return { key: 'auth.unknownError', code: code ?? (error instanceof Error ? error.name : 'unknown_error') };
}

// 共用的服務層錯誤
function common(code: string | null): MappedError | null {
  switch (code) {
    case 'captcha_failed':
    case 'captcha_verification_failed':
      return { key: 'auth.captchaError', code: null };
    case 'request_timeout':
      return { key: 'auth.networkError', code: null };
    case 'unexpected_failure':
    case 'internal_server_error':
    case 'server_error':
      return { key: 'auth.serviceError', code: null };
    default:
      return null;
  }
}

export function mapSignInError(error: unknown): MappedError {
  if (isNetwork(error)) return { key: 'auth.networkError', code: null };
  const code = errorCode(error);
  switch (code) {
    case 'invalid_credentials':
      return { key: 'auth.invalidCredentials', code: null };
    case 'email_not_confirmed':
      return { key: 'auth.emailNotConfirmed', code: null };
    case 'over_request_rate_limit':
    case 'too_many_requests':
    case 'over_email_send_rate_limit':
      return { key: 'auth.signInLocked', code: null, rateLimited: true };
    default:
      return common(code) ?? unknown(error, code);
  }
}

export function mapSignUpError(error: unknown): MappedError {
  if (isNetwork(error)) return { key: 'auth.networkError', code: null };
  const code = errorCode(error);
  switch (code) {
    case 'user_already_exists':
    case 'email_exists':
      return { key: 'auth.emailAlreadyExists', code: null };
    case 'weak_password':
      return { key: 'auth.weakPassword', code: null };
    case 'invalid_email':
    case 'email_address_invalid':
      return { key: 'auth.invalidEmail', code: null };
    case 'over_email_send_rate_limit':
      return { key: 'auth.emailRateLimited', code: null };
    case 'over_request_rate_limit':
    case 'too_many_requests':
      return { key: 'auth.requestRateLimited', code: null };
    case 'signup_disabled':
    case 'email_provider_disabled':
      return { key: 'auth.signupDisabled', code: null };
    default:
      return common(code) ?? unknown(error, code);
  }
}

// 重設密碼信與驗證信重寄共用
export function mapEmailActionError(error: unknown): MappedError {
  // Supabase 寄信逾時（SMTP 無回應）會回 502/503/504，supabase-js 會當成網路錯誤；這裡區分出來，避免誤導使用者去檢查網路
  const status = typeof error === 'object' && error !== null && 'status' in error ? Number(error.status) : 0;
  if ([502, 503, 504].includes(status)) return { key: 'auth.mailServiceError', code: String(status) };
  if (isNetwork(error)) return { key: 'auth.networkError', code: null };
  const code = errorCode(error);
  switch (code) {
    case 'over_email_send_rate_limit':
      return { key: 'auth.emailRateLimited', code: null };
    case 'over_request_rate_limit':
    case 'too_many_requests':
      return { key: 'auth.requestRateLimited', code: null };
    case 'invalid_email':
    case 'email_address_invalid':
      return { key: 'auth.invalidEmail', code: null };
    default:
      return common(code) ?? unknown(error, code);
  }
}

export function mapChangePasswordError(error: unknown): MappedError {
  if (isNetwork(error)) return { key: 'auth.networkError', code: null };
  const code = errorCode(error);
  switch (code) {
    case 'same_password':
      return { key: 'auth.samePassword', code: null };
    case 'weak_password':
      return { key: 'auth.weakPassword', code: null };
    case 'reauthentication_needed':
    case 'reauthentication_not_valid':
    case 'session_not_found':
    case 'session_expired':
    case 'not_authenticated':
      return { key: 'auth.reauthRequired', code: null };
    case 'over_request_rate_limit':
    case 'too_many_requests':
      return { key: 'auth.requestRateLimited', code: null };
    default:
      return common(code) ?? unknown(error, code);
  }
}

export function validateCode(value: string): ErrorKey | null {
  const code = value.trim();
  if (!code) return 'auth.error.codeRequired';
  if (!/^\d{6,8}$/.test(code)) return 'auth.error.codeFormat';
  return null;
}

// 驗證信件中的驗證碼（忘記密碼流程）
export function mapVerifyCodeError(error: unknown): MappedError {
  if (isNetwork(error)) return { key: 'auth.networkError', code: null };
  const code = errorCode(error);
  switch (code) {
    case 'otp_expired':
    case 'otp_disabled':
    case 'validation_failed':
    case 'bad_code_verifier':
      return { key: 'auth.codeInvalid', code: null };
    case 'over_request_rate_limit':
    case 'too_many_requests':
      return { key: 'auth.requestRateLimited', code: null };
    default:
      return common(code) ?? unknown(error, code);
  }
}