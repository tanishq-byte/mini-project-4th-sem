const webpack = require("webpack");
module.exports = {
  webpack: {
    configure: (webpackConfig) => {
      // existing polyfill config...
      webpackConfig.resolve.fallback = {
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer"),
        vm: false,
      };
      webpackConfig.plugins.push(
        new webpack.ProvidePlugin({
          Buffer: ["buffer", "Buffer"],
          process: "process/browser.js",
        })
      );
      webpackConfig.resolve.alias = {
        ...webpackConfig.resolve.alias,
        "process/browser": require.resolve("process/browser.js"),
      };

      // ← ADD THIS: silence third-party source map warnings
      webpackConfig.ignoreWarnings = [/Failed to parse source map/];

      return webpackConfig;
    },
  },
};