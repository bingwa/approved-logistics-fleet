/** @type {import('next').NextConfig} */
const nextConfig = {
  // NEW: move to root, not experimental
  serverExternalPackages: [
    '@prisma/client',
    'puppeteer-core',
    '@sparticuz/chromium'
  ],

  // keep your existing webpack externals if you added them,
  // or remove them if not required after this change

  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'avatars.githubusercontent.com', pathname: '/**' },
    ],
  },
  eslint: { ignoreDuringBuilds: true },
  typescript: { ignoreBuildErrors: true },
  compress: true,
  poweredByHeader: false,
  generateEtags: true,
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          { key: 'X-Frame-Options', value: 'DENY' },
          { key: 'X-Content-Type-Options', value: 'nosniff' },
          { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
        ],
      },
    ]
  },
}
module.exports = nextConfig
