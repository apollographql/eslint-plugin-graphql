import { rules } from '../src';
import { RuleTester } from 'eslint';
import schemaJson from './schema.json';
import path from 'path';

const schemaJsonFilepath = path.resolve(__dirname, './schema.json');
const secondSchemaJsonFilepath = path.resolve(__dirname, './second-schema.json');

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
          message: 'Syntax Error GraphQL (1:7) Expected {, found }',
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
          query sumNow($a: Int, $b: Int) {
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
          message: 'Cannot query field "allFilmsx" on type "RootQuery".',
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
          message: 'Cannot query field "hellox" on type "Greetings".',
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
          message: 'Cannot query field "nonExistentQuery" on type "RootQuery".',
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
          message: 'Cannot query field "hero" on type "RootQuery".',
          type: 'TaggedTemplateExpression',
        }],
      },
    ],
  });
}
