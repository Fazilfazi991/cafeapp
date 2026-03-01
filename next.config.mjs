/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    experimental: {
        serverComponentsExternalPackages: ['puppeteer-core', '@sparticuz/chromium']
    }
};

export default nextConfig;
