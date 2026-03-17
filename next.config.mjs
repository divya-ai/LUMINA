/** @type {import('next').NextConfig} */
const nextConfig = {
  // Required for Transformers.js and WebGPU workers
  async headers() {
    return [
      {
        source: '/(.*)',
        headers: [
          {
            key: 'Cross-Origin-Opener-Policy',
            value: 'same-origin',
          },
          {
            key: 'Cross-Origin-Embedder-Policy',
            value: 'require-corp',
          },
        ],
      },
    ];
  },
  webpack: (config) => {
    // See https://huggingface.co/docs/transformers.js/tutorials/next
    config.resolve.alias = {
      ...config.resolve.alias,
      'sharp$': false,
      'onnxruntime-node$': false,
    };

    // Ignore node-specific modules when bundling for the browser
    config.resolve.fallback = {
      ...config.resolve.fallback,
      fs: false,
      path: false,
      crypto: false,
    };

    // Prefer browser version of packages
    config.resolve.conditionNames = ['browser', 'import', 'require'];

    // Fix for WASM resolution in Transformers.js v4
    // Only treat .wasm files as assets (NOT .mjs files — those must be bundled as JS)
    config.module.rules.push({
      test: /ort-wasm-.*\.wasm$/,
      type: 'asset/resource',
      generator: {
        filename: 'static/wasm/[name][ext]',
      },
    });

    return config;
  },
};

export default nextConfig;
