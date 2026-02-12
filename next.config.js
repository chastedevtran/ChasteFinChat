/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  env: {
    NEXT_PUBLIC_API_URL: process.env.NEXT_PUBLIC_API_URL || 'https://3py7ugu4yc.execute-api.us-west-2.amazonaws.com/prod'
  }
}

module.exports = nextConfig
