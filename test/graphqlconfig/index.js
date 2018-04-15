import { rules } from '../../src';
import { RuleTester } from 'eslint';

const rule = rules['template-strings'];

const parserOptions = {
  'ecmaVersion': 6,
  'sourceType': 'module',
};

const ruleTester = new RuleTester({parserOptions});

describe('graphqlconfig support', () => {
  describe('simple', () => {
    const options = [
      { tagName: 'gql' }
    ];

    beforeEach(() => {
      process.chdir('test/graphqlconfig/simple');
    })

    afterEach(() => {
      process.chdir('../../..');
    })

    ruleTester.run('validation works using schema from .graphqlconfig', rule, {
      valid: [
        {
          options,
          code: 'const x = gql`{ number, sum(a: 1, b: 1) }`;',
        },
      ],
      invalid: [
        {
          options,
          code: 'const y = gql`{ hero(episode: NEWHOPE) { id, name } }`;',
          errors: [{
            message: 'Cannot query field "hero" on type "Query".',
            type: 'TaggedTemplateExpression',
          }],
        },
      ],
    });
  });

  describe('multiproject', () => {
    const options = [
      { projectName: 'gql', tagName: 'gql' },
      { projectName: 'swapi', tagName: 'swapi' },
    ];

    beforeEach(() => {
      process.chdir('test/graphqlconfig/multiproject');
    })

    afterEach(() => {
      process.chdir('../../..');
    })

    ruleTester.run('validation works using multiple schema from .graphqlconfig', rule, {
      valid: [
        {
          options,
          code: [
            'const x = gql`{ number, sum(a: 1, b: 1) }`;',
            'const y = swapi`{ hero(episode: NEWHOPE) { id, name } }`;',
          ].join('\n'),
        },
      ],

      invalid: [
        {
          options,
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
  });
});
