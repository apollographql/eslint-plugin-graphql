import { isGraphQL15 } from '../helpers';
import schemaJson from '../schema.json';

import {
  rule,
  ruleTester,
  parserOptions
} from '../helpers';

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
        column: 15
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
        message: isGraphQL15 ?
          'Unknown argument "wrongArg" on field "Film.director".' :
          'Unknown argument "wrongArg" on field "director" of type "Film".',
        type: 'TaggedTemplateExpression',
        line: 5,
        column: 22
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
        column: 17
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
        column: 19
      }]
    },
  ]
});
