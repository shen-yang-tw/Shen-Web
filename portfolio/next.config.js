/** @type {import('next').NextConfig} */
const nextConfig = {
  images: { unoptimized: true },
  output: "standalone",
  // Dev server blocks /_next/* from non-listed origins (e.g. via Cloudflare Tunnel), breaking hydration.
  allowedDevOrigins: ['127.0.0.1', 'localhost', '*.local', 'shenyang.win', '*.shenyang.win'],
};

module.exports = nextConfig;
