import assert from 'assert';
import { CLIEngine } from 'eslint';
import { includes, keys } from 'lodash';
import path from 'path';

import schemaJson from './schema.json';
import plugin, { processors } from '../src';

function execute(file) {
  const cli = new CLIEngine({
    extensions: ['.gql', '.graphql'],
    baseConfig: {
      rules: {
        'graphql/required-fields': [
          'error',
          {
            schemaJson,
            env: 'literal',
            requiredFields: ['id']
          }
        ]
      }
    },
    ignore: false,
    useEslintrc: false,
    parserOptions: {
      ecmaVersion: 6,
      sourceType: 'module'
    }
  });
  cli.addPlugin('eslint-plugin-graphql', plugin);
  return cli.executeOnFiles([
    path.join(__dirname, '__fixtures__', `${file}.graphql`)
  ]);
}

describe('processors', () => {
  it('should define processors', () => {
    const extensions = keys(processors);

    assert(includes(extensions, '.gql'));
    assert(includes(extensions, '.graphql'));
  });

  it('should wrap with backticks, escape properly and prepend internalTag', () => {
    const query = 'query { search(q: "` \\n ${}") { title } }';
    const expected = 'ESLintPluginGraphQLFile`query { search(q: "\\` \\\\n \\${}") { title } }`';
    const preprocess = processors['.gql'].preprocess;
    const result = preprocess(query);

    assert.equal(result, expected);
  });

  it('should filter only graphql/* rules ', () => {
    const messages = [
      { ruleId: 'no-undef' },
      { ruleId: 'semi' },
      { ruleId: 'graphql/randomString' },
      { ruleId: 'graphql/template-strings' }
    ];
    const expected = { ruleId: 'graphql/template-strings' };
    const postprocess = processors['.gql'].postprocess;
    const result = postprocess(messages);

    assert.equal(result.length, 1);
    assert.equal(result[0].ruleId, expected.ruleId);
  });

  describe('graphql/required-fields', () => {
    describe('valid', () => {
      [
        'required-fields-valid-no-id',
        'required-fields-valid-id',
        'required-fields-valid-array'
      ].forEach(filename => {
        it(`does not warn on file ${filename}`, () => {
          const results = execute(filename);
          assert.equal(results.errorCount, 0);
        });
      });
    });

    describe('invalid', () => {
      [
        'required-fields-invalid-no-id',
        'required-fields-invalid-array'
      ].forEach(filename => {
        it(`warns on file ${filename}`, () => {
          const results = execute(filename);
          assert.equal(results.errorCount, 1);
          const message = results.results[0].messages[0].message;
          assert.ok(new RegExp("'id' field required").test(message));
        });
      });
    });

    describe('error line/column locations', () => {
      it('populates correctly for a single-line document', () => {
        const results = execute('required-fields-invalid-array');
        assert.equal(results.errorCount, 1);
        assert.deepEqual(results.results[0].messages[0], {
          column: 9,
          line: 1,
          message: "'id' field required on 'stories'",
          nodeType: 'TaggedTemplateExpression',
          ruleId: 'graphql/required-fields',
          severity: 2,
          source: 'ESLintPluginGraphQLFile`query { stories { comments { text } } }'
        });
      });

      it('populates correctly for a multi-line document', () => {
        const results = execute('required-fields-invalid-no-id');
        assert.equal(results.errorCount, 1);
        assert.deepEqual(results.results[0].messages[0], {
          column: 3,
          line: 2,
          message: "'id' field required on 'greetings'",
          nodeType: 'TaggedTemplateExpression',
          ruleId: 'graphql/required-fields',
          severity: 2,
          source: '  greetings {'
        });
      });
    });
  });
});
