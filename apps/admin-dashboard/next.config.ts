import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  reactStrictMode: true,
  // Keep Turbopack scoped to this app to avoid choosing parent lockfiles.
  turbopack: {
    root: process.cwd(),
  },
  // Playwright uses 127.0.0.1 by default for baseURL/webServer.
  allowedDevOrigins: ["127.0.0.1", "localhost"],
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "images.unsplash.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
