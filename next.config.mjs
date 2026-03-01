/** @type {import('next').NextConfig} */
const nextConfig = {
    eslint: {
        ignoreDuringBuilds: true,
    },
    typescript: {
        ignoreBuildErrors: true,
    },
    webpack: (config, { isServer }) => {
        if (isServer) {
            // These packages contain native binaries — don't try to bundle them
            config.externals = [...(config.externals || []), '@resvg/resvg-js'];
        }
        return config;
    },
};

export default nextConfig;
