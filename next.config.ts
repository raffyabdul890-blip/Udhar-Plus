import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async headers() {
    return [
      {
        // Service workers already re-check for byte-level changes on every
        // registration per spec, but an explicit no-cache header (per Next's
        // own PWA guide) keeps an intermediary/browser HTTP cache from ever
        // serving a stale sw.js and delaying that update further.
        source: "/sw.js",
        headers: [
          { key: "Content-Type", value: "application/javascript; charset=utf-8" },
          { key: "Cache-Control", value: "no-cache, no-store, must-revalidate" },
        ],
      },
    ];
  },
};

export default nextConfig;
