import {
  parse,
  buildASTSchema,
} from 'graphql';

import { makeRule } from '../graphql-template-string';
import { RuleTester } from 'eslint';

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

const rule = makeRule({
  schema,
});

// Set up tests

const ruleTester = new RuleTester();

const parserOptions = {
  'ecmaVersion': 6,
  'sourceType': 'module',
};

ruleTester.run('default options', rule, {
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

const customRule = makeRule({
  schema,
  tagName: 'myGraphQLTag',
});

ruleTester.run('custom tag name', customRule, {
  valid: [
    {
      parserOptions,
      code: 'const x = myGraphQLTag`{ number }`',
    },
  ],

  invalid: [
    {
      parserOptions,
      code: 'const x = myGraphQLTag`{ ${x} }`',
      errors: [{
        message: 'Unexpected interpolation in GraphQL template string.',
        type: 'TaggedTemplateExpression'
      }]
    },
    {
      parserOptions,
      code: 'const x = myGraphQLTag``',
      errors: [{
        message: 'Syntax Error GraphQL (1:1) Unexpected EOF',
        type: 'TaggedTemplateExpression'
      }]
    },
    {
      parserOptions,
      code: 'const x = myGraphQLTag`{ nonExistentQuery }`',
      errors: [{
        message: 'Cannot query field "nonExistentQuery" on type "RootQuery".',
        type: 'TaggedTemplateExpression'
      }]
    }
  ]
});
