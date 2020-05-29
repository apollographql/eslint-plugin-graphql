import {
  isAtLeastGraphQL15,
  schemaJsonFilepath,
  secondSchemaJsonFilepath,
  schemaString,
  rule,
  ruleTester,
  parserOptions
} from '../helpers';

{
  const options = [
    { schemaString },
  ];

  ruleTester.run('schemaString', rule, {
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
          message: isAtLeastGraphQL15 ? 'Syntax Error: Unexpected <EOF>.' :  'Syntax Error: Unexpected <EOF>',
          type: 'TaggedTemplateExpression'
        }]
      },
      {
        options,
        parserOptions,
        code: 'const x = gql`{ nonExistentQuery }`',
        errors: [{
          message: 'Cannot query field "nonExistentQuery" on type "Query".',
          type: 'TaggedTemplateExpression'
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
}

{
  const options = [
    { schemaJsonFilepath, tagName: 'absolute' },
  ];

  ruleTester.run('schema by absolute path', rule, {
    valid: [
      {
        options,
        parserOptions,
        code: 'const x = absolute`{ number, sum(a: 1, b: 1) }`',
      },
    ],

    invalid: [
      {
        options,
        parserOptions,
        code: 'const x = absolute`{ nonExistentQuery }`',
        errors: [{
          message: 'Cannot query field "nonExistentQuery" on type "Query".',
          type: 'TaggedTemplateExpression'
        }]
      }
    ]
  });
}

{
  const options = [
    { schemaJsonFilepath, tagName: 'gql' },
    { schemaJsonFilepath: secondSchemaJsonFilepath, tagName: 'swapi' },
  ];

  ruleTester.run('validates multiple schemas correctly', rule, {
    valid: [
      {
        options,
        parserOptions,
        code: [
          'const x = gql`{ number, sum(a: 1, b: 1) }`;',
          'const y = swapi`{ hero(episode: NEWHOPE) { id, name } }`;',
        ].join('\n'),
      },
    ],

    invalid: [
      {
        options,
        parserOptions,
        code: [
          'const x = swapi`{ number, sum(a: 1, b: 1) }`;',
          'const y = gql`{ hero(episode: NEWHOPE) { id, name } }`;',
        ].join('\n'),
        errors: [{
          message: 'Cannot query field "number" on type "Query".',
          type: 'TaggedTemplateExpression',
        }, {
          message: 'Cannot query field "hero" on type "Query".',
          type: 'TaggedTemplateExpression',
        }],
      },
    ],
  });
}
