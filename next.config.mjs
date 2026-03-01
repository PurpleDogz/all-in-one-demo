/** @type {import('next').NextConfig} */
const nextConfig = {
  serverExternalPackages: ['@prisma/client', 'prisma'],
  output: 'standalone',
  typescript: {
    ignoreBuildErrors: false,
  },
}

export default nextConfig
