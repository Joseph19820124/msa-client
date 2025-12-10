/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    POSTS_SERVICE_URL: process.env.POSTS_SERVICE_URL || 'http://localhost:4000',
    COMMENTS_SERVICE_URL: process.env.COMMENTS_SERVICE_URL || 'http://localhost:4001',
  },
}

module.exports = nextConfig