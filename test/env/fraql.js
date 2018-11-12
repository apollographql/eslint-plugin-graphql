import schemaJson from '../schema.json';

import {
  rule,
  ruleTester,
  parserOptions
} from '../helpers';

const options = [
  { schemaJson, env: 'fraql' },
];

ruleTester.run('fraql', rule, {
  valid: [
    {
      options,
      parserOptions,
      code: 'const x = gql`{ number } ${x}`',
    },
    {
      options,
      parserOptions,
      code: 'const x = gql`query { ${x} }`',
    },
    {
      options,
      parserOptions,
      code: `const x = gql\`
        fragment _ on Film {
          title
          director
          releaseDate
          ... on Film {
            title
            \${xxx}
          }
          ... on Film {
            \${xxx}
          }
        }
      \`
      `,
    },
  ],

  invalid: [],
})
