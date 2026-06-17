import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  reactCompiler: true,
  allowedDevOrigins: ['192.168.0.103', 'db27-181-65-0-35.ngrok-free.app', '*.ngrok-free.app', '*.ngrok.io'],
  typescript: {
    ignoreBuildErrors: true,
  },

  eslint: {
    ignoreDuringBuilds: true,
  },
};



export default nextConfig;
