/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Ensure server is accessible
  experimental: {
    serverComponentsExternalPackages: [],
  },
  // Fix potential hostname issues
  async rewrites() {
    return []
  },
}

export default nextConfig
