import assert from 'assert';
import {
  includes,
  keys,
} from 'lodash';

import { processors } from '../src';

describe('processors', () => {
  it('should define processors', () => {
    const extensions = keys(processors);

    assert(includes(extensions, '.gql'));
    assert(includes(extensions, '.graphql'));
  });

  it('should escape backticks and append internalTag', () => {
    const query = 'query { someValueWith` }'
    const expected = 'ESLintPluginGraphQLFile`query { someValueWith\\` }`'
    const preprocess = processors['.gql'].preprocess;
    const result = preprocess(query);

    assert.equal(result, expected);
  });

  it('should filter only graphql/* rules ', () => {
    const messages = [
      { ruleId: 'no-undef' },
      { ruleId: 'semi' },
      { ruleId: 'graphql/randomString' },
      { ruleId: 'graphql/template-strings' },
    ];
    const expected = { ruleId: 'graphql/template-strings' };
    const postprocess = processors['.gql'].postprocess;
    const result = postprocess(messages);

    assert.equal(result.length, 1);
    assert.equal(result[0].ruleId, expected.ruleId);
  });
});
