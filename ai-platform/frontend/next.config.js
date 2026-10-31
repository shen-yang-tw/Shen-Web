// frontend/next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  poweredByHeader: false,
  allowedDevOrigins: ['127.0.0.1', 'localhost'],
  
  // 🚀 新增這段：將 /api 請求自動代理至後端容器，解決 401 與 CORS 限制
  async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'http://ai-platform-backend:8000/api/:path*',
      },
    ];
  },
};

module.exports = nextConfig;