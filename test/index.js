// This file cannot be written with ECMAScript 2015 because it has to load
// the Babel require hook to enable ECMAScript 2015 features!
require('@babel/register');
require('@babel/core').transform('code', {
  plugins: ['@babel/plugin-transform-runtime']
});

// The tests, however, can and should be written with ECMAScript 2015.
require('./makeProcessors');
require('./graphqlconfig/');
require('./env');
require('./customTagName');
require('./default');
require('./schemaTests');
require('./validationRules');
