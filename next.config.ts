import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  experimental: {
    // Η αναφορά εκτύπωσης ενός μαθήματος (lesson-actions) φτάνει το ~1,5 MB.
    serverActions: { bodySizeLimit: "2mb" },
  },
};

export default nextConfig;
