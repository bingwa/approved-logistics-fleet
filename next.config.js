/** @type {import('next').NextConfig} */
const nextConfig = {
  // Updated for Next.js 15 - moved from experimental
  serverExternalPackages: ['@prisma/client'],
  images: {
    domains: ['avatars.githubusercontent.com'],
  },
  // Disable ESLint during production builds
  eslint: {
    ignoreDuringBuilds: true,
  },
  // Disable TypeScript type checking during builds
  typescript: {
    ignoreBuildErrors: true,
  },
  // Production optimizations
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
}

module.exports = nextConfig
