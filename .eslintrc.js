module.exports = {
  extends: 'eslint:recommended',
  parser: '@babel/eslint-parser',
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module'
  },

  env: {
    mocha: true,
    node: true,
    es6: true
  }
};
