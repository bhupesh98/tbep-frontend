import type { NextConfig } from "next";
import nextra from "nextra";

const nextConfig: NextConfig = {
  output: "export",
  images: {
    unoptimized: true,
    dangerouslyAllowSVG: true,
  },
  turbopack: {},
  transpilePackages: ["shiki"]
};

const withNextra = nextra({
  contentDirBasePath: "/docs",
  defaultShowCopyCode: true,
  readingTime: true,
});

export default withNextra(nextConfig);
