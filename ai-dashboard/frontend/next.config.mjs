/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    unoptimized: true,
  },
  output: 'standalone',
  allowedDevOrigins: ['127.0.0.1', 'localhost', '*.local', 'shenyang.win', '*.shenyang.win'],
}

export default nextConfig
