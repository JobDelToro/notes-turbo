import path from 'node:path';
import type { NextConfig } from 'next';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Emit a self-contained server bundle for a small production Docker image.
  output: 'standalone',
  // Fail the production build on type errors rather than shipping them.
  typescript: { ignoreBuildErrors: false },
  // This app lives beside a monorepo-root lockfile (husky/prettier tooling).
  // Pin Turbopack's root to this directory so it doesn't infer the repo root.
  turbopack: { root: path.resolve(process.cwd()) },
};

export default nextConfig;
