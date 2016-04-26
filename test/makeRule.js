import { rules } from '../src';
import { RuleTester } from 'eslint';
import schemaJson from './schema.json';

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
        code: 'const x = gql`{ ${x} }`',
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
      {
        options,
        parserOptions,
        code: 'const x = myGraphQLTag`{ ${x} }`',
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
      }
    ]
  });
}

{
  const options = [
    { schemaJson },
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
    ]
  });
}
