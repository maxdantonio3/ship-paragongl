/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  images: {
    // This app only ever serves one small static logo through next/image.
    // Skipping the on-demand optimizer avoids relying on the host having
    // `sharp` set up correctly (a common source of images that work in
    // some places and silently 404/500 in others on self-hosted servers).
    unoptimized: true,
  },
};

module.exports = nextConfig;
