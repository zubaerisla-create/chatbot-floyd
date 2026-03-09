import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'images.unsplash.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
   async rewrites() {
    return [
      {
        source: '/api/:path*',
        destination: 'https://main-floyd-model.onrender.com/:path*',
      },
    ];
  },
};

export default nextConfig;
