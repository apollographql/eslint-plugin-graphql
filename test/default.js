import schemaJson from './schema.json';

import {
  rule,
  ruleTester,
  parserOptions
} from './helpers';

const options = [
  { schemaJson },
];

ruleTester.run('default options', rule, {
  valid: [
    {
      options,
      parserOptions,
      code: 'const x = gql`{ number }`',
    },
    {
      options,
      parserOptions,
      code: 'const x = segmented.TagName`height: 12px;`'
    },
    {
      options,
      parserOptions,
      code: 'const x = segmented.gql`height: 12px;`'
    },
    {
      options,
      parserOptions,
      code: 'const x = gql.segmented`height: 12px;`'
    },
    {
      options,
      parserOptions,
      code: 'const x = gql`{ number } ${x}`',
    },
  ],

  invalid: [
    {
      options,
      parserOptions,
      code: 'const x = gql``',
      errors: [{
        message: 'Syntax Error: Unexpected <EOF>',
        type: 'TaggedTemplateExpression'
      }]
    },
    {
      options,
      parserOptions,
      code: 'const x = gql`\n  query {\n    nonExistentQuery\n  }\n`',
      errors: [{
        message: 'Cannot query field "nonExistentQuery" on type "Query".',
        type: 'TaggedTemplateExpression',
        line: 3,
        column: 5
      }]
    },
    {
      options,
      parserOptions,
      code: 'const x = gql`{ ${x} }`',
      errors: [{
        message: 'Invalid interpolation - fragment interpolation must occur outside of the brackets.',
        type: 'Identifier',
        line: 1,
        column: 19
      }]
    },
  ]
});
