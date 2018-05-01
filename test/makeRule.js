import { rules } from '../src';
import { RuleTester } from 'eslint';
import schemaJson from './schema.json';
import path from 'path';
import {
  includes,
  values,
  entries,
} from 'lodash';
import { printSchema, buildClientSchema } from 'graphql';

const schemaJsonFilepath = path.resolve(__dirname, './schema.json');
const secondSchemaJsonFilepath = path.resolve(__dirname, './second-schema.json');
const schemaString = printSchema(buildClientSchema(schemaJson.data))

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
}

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
          message: 'Syntax Error: Unexpected <EOF>',
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
          message: 'Syntax Error: Unexpected <EOF>',
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
}

{
  const options = [
    { schemaJson, env: 'apollo' },
  ];

  ruleTester.run('apollo', rule, {
    valid: [
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
        code: 'const x = gql`query { ${x} }`',
        errors: [{
          message: 'Invalid interpolation - fragment interpolation must occur outside of the brackets.',
          type: 'Identifier'
        }]
      },
      {
        options,
        parserOptions,
        code: 'const x = gql`query }{ ${x}`',
        errors: [{
          message: 'Syntax Error: Expected {, found }',
          type: 'TaggedTemplateExpression'
        }]
      }
    ],
  })
}

{
  const options = [
    { schemaJson, env: 'lokka' },
  ];

  ruleTester.run('lokka', rule, {
    valid: [
      `
        client.query(gql\`
            {
              allFilms {
                films {
                  title
                }
              }
            }
        \`).then(result => {
            console.log(result.allFilms);
        });
      `,
      `
        const filmInfo = client.createFragment(gql\`
          fragment on Film {
            title,
            director,
            releaseDate
          }
        \`);
      `,
      `
        client.query(gql\`
          {
            allFilms {
              films {
                ...\${filmInfo}
              }
            }
          }
        \`).then(result => {
          console.log(result.allFilms.films);
        });
      `,
      // Not possible to validate lokka mutations because you can't put the 'mutation' keyword in
      // there
      // `
      //   client.mutate(gql\`{
      //       newFilm: createMovie(
      //           title: "Star Wars: The Force Awakens",
      //           director: "J.J. Abrams",
      //           producers: [
      //               "J.J. Abrams", "Bryan Burk", "Kathleen Kennedy"
      //           ],
      //           releaseDate: "December 14, 2015"
      //       ) {
      //           ...\${filmInfo}
      //       }
      //   }\`).then(response => {
      //       console.log(response.newFilm);
      //   });
      // `,
      `
        const query = gql\`
          query sumNow($a: Int!, $b: Int!) {
            sum(a: $a, b: $b)
          }
        \`;
      `,
    ].map((code) => ({ options, parserOptions, code })),

    invalid: [
      {
        options,
        parserOptions,
        code: `
          client.query(gql\`
              {
                allFilmsx {
                  films {
                    title
                  }
                }
              }
          \`).then(result => {
              console.log(result.allFilms);
          });
        `,
        errors: [{
          message: 'Cannot query field "allFilmsx" on type "Query". Did you mean "allFilms"?',
          type: 'TaggedTemplateExpression',
          line: 4,
          column: 17
        }]
      },
      {
        options,
        parserOptions,
        code: `
          const filmInfo = client.createFragment(gql\`
            fragment on Film {
              title,
              director(wrongArg: 7),
              releaseDate
            }
          \`);
        `,
        errors: [{
          message: 'Unknown argument "wrongArg" on field "director" of type "Film".',
          type: 'TaggedTemplateExpression',
          line: 5,
          column: 24
        }]
      },
      {
        options,
        parserOptions,
        code: `
          client.query(gql\`
            {
              allFilms {
                films {
                  ...\${filmInfo}
                  unknownField
                }
              }
            }
          \`).then(result => {
            console.log(result.allFilms.films);
          });
        `,
        errors: [{
          message: 'Cannot query field "unknownField" on type "Film".',
          type: 'TaggedTemplateExpression',
          line: 7,
          column: 19
        }]
      },
      {
        options,
        parserOptions,
        code: `
          client.query(gql\`
            {
              allFilms {
                films {
                  \${filmInfo}
                }
              }
            }
          \`).then(result => {
            console.log(result.allFilms.films);
          });
        `,
        errors: [{
          message: 'Invalid interpolation - not a valid fragment or variable.',
          type: 'Identifier',
          line: 6,
          column: 21
        }]
      },
    ]
  });
}

{
  const options = [
    {
      schemaJson,
      env: 'relay',
    },
  ];

  // Need this to support statics
  const parser = 'babel-eslint';

  ruleTester.run('relay', rule, {
    valid: [
      `
        @relay({
          fragments: {
            greetings: () => Relay.QL\`
              fragment on Greetings {
                hello,
                hi,
              }
            \`,
          }
        })
        class HelloApp extends React.Component {}
      `,
      `
        const StyledComponent = css\`height: 12px;\`
      `,
      `
        HelloApp = Relay.createContainer(HelloApp, {
          fragments: {
            greetings: () => Relay.QL\`
              fragment on Greetings {
                hello,
              }
            \`,
          }
        });
      `,
      `
        class HelloRoute extends Relay.Route {
          static routeName = 'Hello';  // A unique name
          static queries = {
            greetings: (Component) => Relay.QL\`
              query GreetingsQuery {
                greetings {
                  \${Component.getFragment('greetings')},
                },
              }
            \`,
          };
        }
      `,
      `
        class CreateCommentMutation extends Relay.Mutation {
          static fragments = {
            story: () => Relay.QL\`
              fragment on Story { id }
            \`,
          };
          getMutation() {
            return Relay.QL\`
              mutation { createComment }
            \`;
          }
          getFatQuery() {
            return Relay.QL\`
              fragment on CreateCommentPayload {
                story { comments },
              }
            \`;
          }
          getConfigs() {
            return [{
              type: 'FIELDS_CHANGE',
              fieldIDs: { story: this.props.story.id },
            }];
          }
          getVariables() {
            return { text: this.props.text };
          }
        }
      `,
      `
        Relay.QL\`fragment on CreateEventPayload @relay(pattern: true) {
          viewer {
            events
          }
          user {
            events
          }
        }\`
      `
    ].map((code) => ({ options, parser, code })),

    invalid: [
      {
        options,
        parser,
        code: `
          @relay({
            fragments: {
              greetings: () => Relay.QL\`
                fragment on Greetings {
                  hellox,
                }
              \`,
            }
          })
          class HelloApp extends React.Component {}
        `,
        errors: [{
          message: 'Cannot query field "hellox" on type "Greetings". Did you mean "hello"?',
          type: 'TaggedTemplateExpression',
          line: 6,
          column: 19
        }]
      },
      // Example from issue report:
      // https://github.com/apollostack/eslint-plugin-graphql/issues/12#issuecomment-215445880
      {
        options,
        parser,
        code: `
          import React, { Component, View } from 'react-native';
          import Relay from 'react-relay';

          @relay({
            fragments: {
              user: () => Relay.QL\`
                fragment on PublicUser {
                  fullName
                  nonExistentField
                }
              \`
            }
          })
          class Example extends Component {
            render() {
              return <View/>;
            }
          }

          class AnotherExample extends Component {
            render() {
              return <View/>;
            }
          }

          Relay.createContainer(
            AnotherExample,
            {
              fragments: {
                user: () => Relay.QL\`
                  fragment on PublicUser {
                    fullName
                    nonExistentField
                  }
                \`
              }
            }
          );
        `,
        errors: [
          {
            message: 'Cannot query field "nonExistentField" on type "PublicUser".',
            line: 10,
            column: 19,
          },
          {
            message: 'Cannot query field "nonExistentField" on type "PublicUser".',
            line: 34,
            column: 21,
          },
        ],
      },
    ],
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

const validatorCases = {
  'FieldsOnCorrectType': {
    pass: 'const x = gql`{ allFilms { films { title } } }`',
    fail: 'const x = gql`{ allFilms { films { greetings } } }`',
    errors: [{
      message: 'Cannot query field "greetings" on type "Film".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'FragmentsOnCompositeTypes': {
    pass: 'const x = gql`{ allFilms { films { ...on Film { title } } } }`',
    fail: 'const x = gql`{ allFilms { films { ...on String { foo } } } }`',
    alsoBreaks: ['PossibleFragmentSpreads'],
    errors: [{
      message: 'Fragment cannot condition on non composite type "String".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'KnownArgumentNames': {
    pass: 'const x = gql`{ sum(a: 1, b: 2) }`',
    fail: 'const x = gql`{ sum(c: 1, d: 2) }`',
    alsoBreaks: ['ProvidedNonNullArguments'],
    errors: [{
      message: 'Unknown argument "c" on field "sum" of type "Query". Did you mean "a" or "b"?',
      type: 'TaggedTemplateExpression',
    }],
  },
  'KnownDirectives': {
    pass: 'const x = gql`{ number, allFilms @include(if: false) { films { title } } }`',
    fail: 'const x = gql`{ number, allFilms @goofy(if: false) { films { title } } }`',
    errors: [{
      message: 'Unknown directive "goofy".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'KnownFragmentNames': {
    pass: 'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`',
    fail: 'const x = gql`{ allFilms { films { ...FilmFragment } } }`',
    errors: [{
      message: 'Unknown fragment "FilmFragment".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'KnownTypeNames': {
    pass: 'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`',
    fail: 'const x = gql`fragment FilmFragment on Floof { title } { allFilms { films { ...FilmFragment } } }`',
    errors: [{
      message: 'Unknown type "Floof".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'LoneAnonymousOperation': {
    pass: 'const x = gql`{ number }`',
    fail: 'const x = gql`{ number } { number }`',
    errors: [{
      message: 'This anonymous operation must be the only defined operation.',
      type: 'TaggedTemplateExpression',
    }],
  },

  // This causes a `RangeError: Maximum call stack size exceeded` exception in graphql 0.8.x
  // 'NoFragmentCycles': {
  //   pass: 'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`',
  //   fail: 'const x = gql`fragment FilmFragment on Film { title, ...FilmFragment } { allFilms { films { ...FilmFragment } } }`',
  //   errors: [{
  //     message: 'Cannot spread fragment "FilmFragment" within itself.',
  //     type: 'TaggedTemplateExpression',
  //   }],
  // },

  'NoUndefinedVariables': {
    pass: 'const x = gql`query($a: Int!) { sum(a: $a, b: 1) }`',
    fail: 'const x = gql`query($a: Int!) { sum(a: $a, b: $b) }`',
    errors: [{
      message: 'Variable "$b" is not defined.',
      type: 'TaggedTemplateExpression',
    }],
  },
  'NoUnusedFragments': {
    pass: 'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`',
    fail: 'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { title } } }`',
    errors: [{
      message: 'Fragment "FilmFragment" is never used.',
      type: 'TaggedTemplateExpression',
    }],
  },
  'NoUnusedVariables': {
    pass: 'const x = gql`query($a: Int!) { sum(a: $a, b: 1) }`',
    fail: 'const x = gql`query($a: Int!) { sum(a: 1, b: 1) }`',
    errors: [{
      message: 'Variable "$a" is never used.',
      type: 'TaggedTemplateExpression',
    }],
  },
  'OverlappingFieldsCanBeMerged': {
    pass: 'const x = gql`fragment Sum on Query { sum(a: 1, b: 2) } { ...Sum, sum(a: 1, b: 2) }`',
    fail: 'const x = gql`fragment Sum on Query { sum(a: 1, b: 2) } { ...Sum, sum(a: 2, b: 3) }`',
    errors: [{
      message: 'Fields "sum" conflict because they have differing arguments. Use different aliases on the fields to fetch both if this was intentional.',
      type: 'TaggedTemplateExpression',
    }],
  },
  'PossibleFragmentSpreads': {
    pass: 'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`',
    fail: 'const x = gql`fragment FilmFragment on Film { title } { greetings { ...FilmFragment } }`',
    errors: [{
      message: 'Fragment "FilmFragment" cannot be spread here as objects of type "Greetings" can never be of type "Film".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'ProvidedNonNullArguments': {
    pass: 'const x = gql`{ sum(a: 1, b: 2) }`',
    fail: 'const x = gql`{ sum(a: 1) }`',
    errors: [{
      message: 'Field "sum" argument "b" of type "Int!" is required but not provided.',
      type: 'TaggedTemplateExpression',
    }],
  },
  'ScalarLeafs': {
    pass: 'const x = gql`{ number }`',
    fail: 'const x = gql`{ allFilms }`',
    errors: [{
      message: 'Field "allFilms" of type "AllFilmsObj" must have a selection of subfields. Did you mean "allFilms { ... }"?',
      type: 'TaggedTemplateExpression',
    }],
  },
  'UniqueArgumentNames': {
    pass: 'const x = gql`{ sum(a: 1, b: 2) }`',
    fail: 'const x = gql`{ sum(a: 1, a: 2) }`',
    alsoBreaks: ['ProvidedNonNullArguments'],
    errors: [{
      message: 'There can be only one argument named "a".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'UniqueFragmentNames': {
    pass: 'const x = gql`fragment FF1 on Film { title } fragment FF2 on Film { director } { allFilms { films { ...FF1, ...FF2 } } }`',
    fail: 'const x = gql`fragment FF on Film { title } fragment FF on Film { director } { allFilms { films { ...FF } } }`',
    errors: [{
      message: 'There can be only one fragment named "FF".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'UniqueInputFieldNames': {
    pass: 'const x = gql`mutation { createComment(input: { stuff: "Yay" }) { story { id } } }`',
    fail: 'const x = gql`mutation { createComment(input: { stuff: "Yay", stuff: "No" }) { story { id } } }`',
    errors: [{
      message: 'There can be only one input field named "stuff".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'UniqueOperationNames': {
    pass: 'const x = gql`query Q1 { sum(a: 1, b: 2) } query Q2 { sum(a: 2, b: 3) }`',
    fail: 'const x = gql`query Q { sum(a: 1, b: 2) } query Q { sum(a: 2, b: 3) }`',
    errors: [{
      message: 'There can be only one operation named "Q".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'UniqueVariableNames': {
    pass: 'const x = gql`query($a: Int!, $b: Int!) { sum(a: $a, b: $b) }`',
    fail: 'const x = gql`query($a: Int!, $a: Int!) { sum(a: $a, b: $a) }`',
    errors: [{
      message: 'There can be only one variable named "a".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'VariablesAreInputTypes': {
    pass: 'const x = gql`query($a: Int!, $b: Int!) { sum(a: $a, b: $b) }`',
    fail: 'const x = gql`query($a: Film!) { sum(a: 1, b: 1) }`',
    alsoBreaks: ['NoUnusedVariables'],
    errors: [{
      message: 'Variable "$a" cannot be non-input type "Film!".',
      type: 'TaggedTemplateExpression',
    }],
  },
  'VariablesInAllowedPosition': {
    pass: 'const x = gql`query($a: Int!) { sum(a: $a, b: 1) }`',
    fail: 'const x = gql`query($a: String!) { sum(a: $a, b: 1) }`',
    errors: [{
      message: 'Variable "$a" of type "String!" used in position expecting type "Int!".',
      type: 'TaggedTemplateExpression',
    }],
  },
};

const namedOperationsValidatorCases = {
  'OperationsMustHaveNames': {
    pass: 'const x = gql`query Test { sum(a: 1, b: 2) }`',
    fail: 'const x = gql`query { sum(a: 1, b: 2) }`',
    errors: [{
      message: 'All operations must be named',
      type: 'TaggedTemplateExpression',
    }],
  },
};

const requiredFieldsTestCases = {
  pass: [
    'const x = gql`query { allFilms { films { title } } }`',
    'const x = gql`query { stories { id comments { text } } }`',
    'const x = gql`query { greetings { id, hello, foo } }`',
    'const x = gql`query { greetings { hello ... on Greetings { id } } }`',
  ],
  fail: [
    {
      code: 'const x = gql`query { stories { comments { text } } }`',
      errors: [{
        message: `'id' field required on 'stories'`,
        type: 'TaggedTemplateExpression',
      }],
    },
    {
      code: 'const x = gql`query { greetings { hello } }`',
      errors: [{
        message: `'id' field required on 'greetings'`,
        type: 'TaggedTemplateExpression',
      }],
    },
    {
      code: 'const x = gql`query { greetings { hello ... on Greetings { foo } } }`',
      errors: [
        {
          message: `'id' field required on 'greetings'`,
          type: 'TaggedTemplateExpression',
        },
      ],
    },
  ],
};

const typeNameCapValidatorCases = {
  pass: [
    'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`',
    'const x = gql`query { someUnion {... on SomeUnionMember { someField }}}`',
  ],
  fail: [
    {
      code: 'const x = gql`fragment FilmFragment on film { title } { allFilms { films { ...FilmFragment } } }`',
      errors: [{
        message: 'All type names should start with a capital letter',
        type: 'TaggedTemplateExpression',
      }],
    },
    {
      code: 'const x = gql`query { someUnion {... on someUnionMember { someField }}}`',
      errors: [{
        message: 'All type names should start with a capital letter',
        type: 'TaggedTemplateExpression',
      }],
    },
  ]
};

const noDeprecatedFieldsCases = {
  pass: [
    `
      @relay({
        fragments: {
          greetings: () => Relay.QL\`
            fragment on Greetings {
              hello,
            }
          \`,
        }
      })
      class HelloApp extends React.Component {}
    `,
    `
      @relay({
        fragments: {
          greetings: () => Relay.QL\`
            fragment on Greetings {
              image(size: LARGE) { size }
            }
          \`,
        }
      })
      class HelloApp extends React.Component {}
    `,
  ],
  fail: [
    {
      options,
      parser: 'babel-eslint',
      code: `
        @relay({
          fragments: {
            greetings: () => Relay.QL\`
              fragment on Greetings {
                hi,
              }
            \`,
          }
        })
        class HelloApp extends React.Component {}
      `,
      errors: [{
        message: "The field Greetings.hi is deprecated. Please use the more formal greeting 'hello'",
        type: 'TaggedTemplateExpression',
        line: 6,
        column: 17
      }]
    },
    {
      options,
      parser: 'babel-eslint',
      code: `
        @relay({
          fragments: {
            greetings: () => Relay.QL\`
              fragment on Greetings {
                image(size: SMALL) { size }
              }
            \`,
          }
        })
        class HelloApp extends React.Component {}
      `,
      errors: [{
        message: "The enum value ImageSize.SMALL is deprecated. Use 'LARGE' instead",
        type: 'TaggedTemplateExpression',
        line: 6,
        column: 29
      }]
    },
  ]
};

{
  let options = [{
    schemaJson, tagName: 'gql',
    validators: 'all',
  }];
  ruleTester.run('enabled all validators', rule, {
    valid: values(validatorCases).map(({pass: code}) => ({options, parserOptions, code})),
    invalid: values(validatorCases).map(({fail: code, errors}) => ({options, parserOptions, code, errors})),
  });

  options = [{
    schemaJson, tagName: 'gql',
    validators: [],
  }];
  ruleTester.run('disabled all validators', rule, {
    valid: [].concat(
      values(validatorCases).map(({pass: code}) => code),
      values(validatorCases).map(({fail: code}) => code),
    ).map(code => ({options, parserOptions, code})),
    invalid: [],
  });

  // Check that when only a given validation is enabled, it's the only thing
  // that can fail. (Excluding test cases that include this validation rule as
  // 'alsoBreaks'…sometimes it's hard to make a test that fails exactly one
  // validator).
  for (const [validatorName, {pass, fail, errors}] of entries(validatorCases)) {
    options = [{
      schemaJson, tagName: 'gql',
      validators: [validatorName],
    }];
    const otherValidators = (
      entries(validatorCases)
        .filter(([otherValidatorName, {alsoBreaks}]) => otherValidatorName !== validatorName && !includes((alsoBreaks || []), validatorName))
        .map(([name, testCases]) => testCases)
    );
    ruleTester.run(`enabled only ${validatorName} validator`, rule, {
      valid: [].concat(
        values(validatorCases).map(({pass: code}) => code),
        otherValidators.map(({fail: code}) => code),
      ).map(code => ({options, parserOptions, code})),
      invalid: [{options, parserOptions, errors, code: fail}],
    });
  }

  // Validate the named-operations rule
  options = [{
    schemaJson, tagName: 'gql',
  }];
  ruleTester.run('testing named-operations rule', rules['named-operations'], {
    valid: values(namedOperationsValidatorCases).map(({pass: code}) => ({options, parserOptions, code})),
    invalid: values(namedOperationsValidatorCases).map(({fail: code, errors}) => ({options, parserOptions, code, errors})),
  });

  // Validate the required-fields rule with env specified
  options = [{
    schemaJson,
    env: 'apollo',
    tagName: 'gql',
    requiredFields: ['id'],
  }];

  ruleTester.run('testing required-fields rule', rules['required-fields'], {
    valid: requiredFieldsTestCases.pass.map((code) => ({options, parserOptions, code})),
    invalid: requiredFieldsTestCases.fail.map(({code, errors}) => ({options, parserOptions, code, errors})),
  });

  // Validate required-fields without optional env argument
  options = [{
    schemaJson,
    tagName: 'gql',
    requiredFields: ['id'],
  }];
  ruleTester.run('testing required-fields rule', rules['required-fields'], {
    valid: requiredFieldsTestCases.pass.map((code) => ({options, parserOptions, code})),
    invalid: requiredFieldsTestCases.fail.map(({code, errors}) => ({options, parserOptions, code, errors})),
  });
}

let options = [{
  schemaJson, tagName: 'gql',
}];
ruleTester.run('testing capitalized-type-name rule', rules['capitalized-type-name'], {
  valid: typeNameCapValidatorCases.pass.map((code) => ({options, parserOptions, code})),
  invalid: typeNameCapValidatorCases.fail.map(({code, errors}) => ({options, parserOptions, code, errors})),
});

options = [
  {
    schemaJson,
    env: 'relay',
  },
];
ruleTester.run('testing no-deprecated-fields rule', rules['no-deprecated-fields'], {
  valid: noDeprecatedFieldsCases.pass.map((code) => ({options, parser: 'babel-eslint', code})),
  invalid: noDeprecatedFieldsCases.fail.map(({code, errors}) => ({options, parser: 'babel-eslint', code, errors})),
});
