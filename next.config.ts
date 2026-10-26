import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // react-leaflet's MapContainer can't cleanly reinitialize into the same DOM
  // node when React 19 double-invokes effects under Strict Mode in dev --
  // Leaflet owns that container, not React, and throws "already initialized"
  // / appendChild errors on the second mount. Dev-only; production builds
  // never double-invoke effects, so this only affects local development.
  reactStrictMode: false,
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
