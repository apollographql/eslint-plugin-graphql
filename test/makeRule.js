import {
  parse,
  buildASTSchema,
  introspectionQuery,
  graphql,
} from 'graphql';

import { rules } from '../src';
import { RuleTester } from 'eslint';
import schemaJson from './schema.json';

// Set up a fake schema for tests

const typeDefinition = `
  schema {
    query: RootQuery
  }

  type RootQuery {
    number: Int
  }
`;

const schema = buildASTSchema(parse(typeDefinition));

// Init rule

const rule = rules['template-strings'];

// Set up tests

const ruleTester = new RuleTester();

const parserOptions = {
  'ecmaVersion': 6,
  'sourceType': 'module',
};

{
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
    ],

    invalid: [
      {
        options,
        parserOptions,
        code: 'const x = gql`{ ${x} }`',
        errors: [{
          message: 'Unexpected interpolation in GraphQL template string.',
          type: 'TaggedTemplateExpression'
        }]
      },
      {
        options,
        parserOptions,
        code: 'const x = gql``',
        errors: [{
          message: 'Syntax Error GraphQL (1:1) Unexpected EOF',
          type: 'TaggedTemplateExpression'
        }]
      },
      {
        options,
        parserOptions,
        code: 'const x = gql`{ nonExistentQuery }`',
        errors: [{
          message: 'Cannot query field "nonExistentQuery" on type "RootQuery".',
          type: 'TaggedTemplateExpression'
        }]
      }
    ]
  });
}

{
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
        code: 'const x = myGraphQLTag`{ ${x} }`',
        errors: [{
          message: 'Unexpected interpolation in GraphQL template string.',
          type: 'TaggedTemplateExpression'
        }]
      },
      {
        options,
        parserOptions,
        code: 'const x = myGraphQLTag``',
        errors: [{
          message: 'Syntax Error GraphQL (1:1) Unexpected EOF',
          type: 'TaggedTemplateExpression'
        }]
      },
      {
        options,
        parserOptions,
        code: 'const x = myGraphQLTag`{ nonExistentQuery }`',
        errors: [{
          message: 'Cannot query field "nonExistentQuery" on type "RootQuery".',
          type: 'TaggedTemplateExpression'
        }]
      }
    ]
  });
}
