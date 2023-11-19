module.exports = {
  presets: ["@babel/preset-env"],
  plugins: [
    ["@babel/plugin-transform-runtime"],
    ["@babel/plugin-proposal-decorators", { legacy: true }],
  ],
};
