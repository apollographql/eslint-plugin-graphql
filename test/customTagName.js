import schemaJson from './schema.json';
import { isGraphQL15 } from './helpers';

import {
  rule,
  ruleTester,
  parserOptions
} from './helpers';

const options = [
  { schemaJson, tagName: 'myGraphQLTag' },
];

ruleTester.run('custom tag name', rule, {
  valid: [
    {
      options,
      parserOptions,
      code: 'const x = myGraphQLTag`{ number }`',
    },
  ],

  invalid: [
    {
      options,
      parserOptions,
      code: 'const x = myGraphQLTag``',
      errors: [{
        message: isGraphQL15 ? 'Syntax Error: Unexpected <EOF>.' : 'Syntax Error: Unexpected <EOF>',
        type: 'TaggedTemplateExpression'
      }]
    },
    {
      options,
      parserOptions,
      code: 'const x = myGraphQLTag`{ nonExistentQuery }`',
      errors: [{
        message: 'Cannot query field "nonExistentQuery" on type "Query".',
        type: 'TaggedTemplateExpression'
      }]
    },
    {
      options,
      parserOptions,
      code: 'const x = myGraphQLTag`{ ${x} }`',
      errors: [{
        type: 'Identifier',
        message: 'Invalid interpolation - fragment interpolation must occur outside of the brackets.'
      }]
    },
  ]
});
