import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  // Previous theory (disabling reactStrictMode) was wrong and didn't fix it --
  // the real cause, confirmed from the browser's actual stack trace, is
  // Next's experimental cacheComponents/partialPrefetching: they use React's
  // Activity mechanism to keep prefetched route segments mounted-but-hidden
  // and "reconnect" them on navigation (reconnectPassiveEffects in the
  // trace), rather than a fresh mount. Leaflet's MapContainer has no concept
  // of being reconnected without unmounting first, so it throws "Map
  // container is being reused by another instance". These two options are
  // the actual culprits; reactStrictMode was never the issue.
  cacheComponents: false,
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
