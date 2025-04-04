/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // Allow production builds to complete despite type errors
    ignoreBuildErrors: true,
  },
}

module.exports = nextConfig