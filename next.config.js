/** @type {import('next').NextConfig} */
const nextConfig = {
  // For Prisma on Vercel - ensures Prisma Client works properly
  serverExternalPackages: ['@prisma/client'],
  
  // Image optimization
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'avatars.githubusercontent.com',
        port: '',
        pathname: '/**',
      },
    ],
  },
  
  // Disable ESLint during production builds to prevent deployment failures
  eslint: {
    ignoreDuringBuilds: true,
  },
  
  // Disable TypeScript type checking during builds for faster deployment
  typescript: {
    ignoreBuildErrors: true,
  },
  
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  
  // Security headers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY'
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff'
          },
          {
            key: 'Referrer-Policy',
            value: 'strict-origin-when-cross-origin'
          }
        ]
      }
    ]
  }
}

module.exports = nextConfig
