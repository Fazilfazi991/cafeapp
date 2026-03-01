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
            // Prevent webpack from trying to bundle these packages.
            // They use native binaries / WASM that must be loaded at runtime, not compiled.
            const externals = ['satori', 'sharp', 'yoga-wasm-web', '@img/sharp-linux-x64', '@img/sharp-wasm32'];
            if (Array.isArray(config.externals)) {
                config.externals.push(...externals);
            } else {
                config.externals = [config.externals, ...externals].filter(Boolean);
            }
        }
        // Ignore .node binary files (native addons) — let them be loaded at runtime
        config.module.rules.push({
            test: /\.node$/,
            use: 'node-loader',
        });
        return config;
    },
};

export default nextConfig;
