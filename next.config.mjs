/** @type {import('next').NextConfig} */
const nextConfig = {
  // 啟用 React 嚴格模式
  reactStrictMode: true,
  
  // 圖片優化設定
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  
  // 實驗性功能
  experimental: {
    // 啟用 Server Actions
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

export default nextConfig;
