import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // The floating dev badge sits on top of the dashboard and lands in every
  // screenshot; nothing here depends on it.
  devIndicators: false,
};

export default nextConfig;
