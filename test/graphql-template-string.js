const rule = require('../graphql-template-string');
const RuleTester = require('eslint').RuleTester;

const ruleTester = new RuleTester();

const parserOptions = {
  'ecmaVersion': 6,
  'sourceType': 'module',
};

ruleTester.run('graphql-template-string', rule, {
  valid: [
    {
      parserOptions,
      code: 'const x = gql`{ number }`',
    },
  ],

  invalid: [
    {
      parserOptions,
      code: 'const x = gql`{ ${x} }`',
      errors: [{
        message: 'Unexpected interpolation in GraphQL template string.',
        type: 'TaggedTemplateExpression'
      }]
    },
    {
      parserOptions,
      code: 'const x = gql``',
      errors: [{
        message: 'Syntax Error GraphQL (1:1) Unexpected EOF',
        type: 'TaggedTemplateExpression'
      }]
    },
    {
      parserOptions,
      code: 'const x = gql`{ nonExistentQuery }`',
      errors: [{
        message: 'Cannot query field "nonExistentQuery" on type "RootQuery".',
        type: 'TaggedTemplateExpression'
      }]
    }
  ]
});
