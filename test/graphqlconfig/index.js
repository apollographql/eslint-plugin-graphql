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

  describe('multiproject literal', () => {
    beforeEach(() => {
      process.chdir('test/graphqlconfig/multiproject-literal');
    })

    afterEach(() => {
      process.chdir('../../..');
    })

    ruleTester.run('validation works using multiple schemas from .graphqlconfig', rule, {
      valid: [
        {
          options: [{ env: 'literal' }],
          code: 'const x = ESLintPluginGraphQLFile`{ number, sum(a: 1, b: 1) }`;',
          filename: 'first.graphql',
        },
        {
          options: [{ env: 'literal' }],
          code: 'const x = ESLintPluginGraphQLFile`{ hero(episode: NEWHOPE) { id, name } }`;',
          filename: 'second.graphql',
        },
        {
          options: [{ env: 'literal' }],
          code: 'const x = ESLintPluginGraphQLFile`{ number, sum(a: 1, b: 1) }`;',
          filename: 'excluded1.graphql',
        },
        {
          options: [{ env: 'literal' }],
          code: 'const x = ESLintPluginGraphQLFile`{ hero(episode: NEWHOPE) { id, name } }`;',
          filename: 'excluded2.graphql',
        },
      ],

      invalid: [
        {
          options: [{ env: 'literal' }],
          code: 'const x = ESLintPluginGraphQLFile`{ number, sum(a: 1, b: 1) }`;',
          filename: 'second.graphql',
          errors: [{
            message: /cannot query field .number./i,
          }],
        },
        {
          options: [{ env: 'literal' }],
          code: 'const x = ESLintPluginGraphQLFile`{ hero(episode: NEWHOPE) { id, name } }`;',
          filename: 'first.graphql',
          errors: [{
            message: /cannot query field .hero./i,
          }],
        },
      ],
    });
  });
});
