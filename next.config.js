/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverComponentsExternalPackages: ['better-sqlite3'],
  },
  // Add webpack configuration to handle Node.js modules
  webpack: (config, { isServer }) => {
    // If client-side, provide fallbacks for node modules
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        path: false,
        child_process: false,
        sqlite3: false,
        'better-sqlite3': false,
      };
    }
    return config;
  },
}

module.exports = nextConfig
