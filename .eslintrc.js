module.exports = {
  extends: "eslint:recommended",
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: "module",
    babelOptions: {
      presets: ["@babel/preset-react"],
    },
  },
  env: {
    mocha: true,
    node: true,
    es6: true,
  },
};
