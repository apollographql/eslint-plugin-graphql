module.exports = {
  presets: [["@babel/env"]],
  plugins: [
    "@babel/plugin-transform-react-jsx",
    ["@babel/plugin-proposal-decorators", { legacy: true }],
  ],
};
