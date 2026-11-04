import React from 'react';

// 將原本的 SVG 轉為 React 規格，並保留漸層與尺寸
export const DashboardIcon = (props: React.SVGProps<SVGSVGElement>) => (
  <svg
    aria-hidden="true"
    viewBox="0 0 32 32"
    fill="none"
    className="size-9 shrink-0"
    {...props} // 允許外部傳入的 className（如 h-6 w-6）覆蓋或累加
  >
    <defs>
      <linearGradient id="brand-gradient" x1="2" y1="28" x2="30" y2="4" gradientUnits="userSpaceOnUse">
        <stop stopColor="#6366F1" />
        <stop offset="1" stopColor="#0891B2" />
      </linearGradient>
    </defs>
    <path
      d="M3 22c4 0 5-9 9-9s5 9 9 9 4-12 8-12"
      stroke="url(#brand-gradient)"
      strokeWidth="3.4"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <circle cx="27" cy="10" r="2.6" fill="#0891B2" />
  </svg>
);
