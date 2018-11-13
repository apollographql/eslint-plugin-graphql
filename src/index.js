import fs from 'fs';
import path from 'path';
import {
  buildClientSchema,
  buildSchema,
  specifiedRules as allGraphQLValidators
} from 'graphql';

import {
  flatten,
  keys,
  reduce,
  without,
  includes,
} from 'lodash';

import { getGraphQLConfig, ConfigNotFoundError } from 'graphql-config';

import * as customRules from './customGraphQLValidationRules';
import {internalTag} from './constants';
import {createRule} from './createRule';

const allGraphQLValidatorNames = allGraphQLValidators.map(rule => rule.name);

// Map of env name to list of rule names.
const envGraphQLValidatorNames = {
  apollo: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
  lokka: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
  fraql: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
  relay: without(allGraphQLValidatorNames,
    'KnownDirectives',
    'KnownFragmentNames',
    'NoUndefinedVariables',
    'NoUnusedFragments',
    // `graphql` < 14
    'ProvidedNonNullArguments',
    // `graphql`@14
    'ProvidedRequiredArguments',
    'ScalarLeafs',
  ),
  literal: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
};

const gqlFiles = ['gql', 'graphql'];

const defaultRuleProperties = {
  env: {
    enum: [
      'lokka',
      'fraql',
      'relay',
      'apollo',
      'literal',
    ],
  },
  schemaJson: {
    type: 'object',
  },
  schemaJsonFilepath: {
    type: 'string',
  },
  schemaString: {
    type: 'string',
  },
  tagName: {
    type: 'string',
    pattern: '^[$_a-zA-Z$_][a-zA-Z0-9$_]+(\\.[a-zA-Z0-9$_]+)?$',
  },
  projectName: {
    type: 'string'
  }
}

// schemaJson, schemaJsonFilepath, schemaString and projectName are mutually exclusive:
const schemaPropsExclusiveness = {
  oneOf: [{
    required: ['schemaJson'],
    not: { required: ['schemaString', 'schemaJsonFilepath', 'projectName']}
  }, {
    required: ['schemaJsonFilepath'],
    not: { required: ['schemaJson', 'schemaString', 'projectName']}
  }, {
    required: ['schemaString'],
    not: { required: ['schemaJson', 'schemaJsonFilepath', 'projectName']}
  }, {
    not: {
      anyOf: [
        { required: ['schemaString'] },
        { required: ['schemaJson'] },
        { required: ['schemaJsonFilepath'] },
      ]
    }
  }],
}

export const rules = {
  'template-strings': {
    meta: {
      schema: {
        type: 'array',
        items: {
          additionalProperties: false,
          properties: {
            ...defaultRuleProperties,
            validators: {
              oneOf: [{
                type: 'array',
                uniqueItems: true,
                items: {
                  enum: allGraphQLValidatorNames,
                },
              }, {
                enum: [
                  'all',
                ],
              }],
            },
          },
          ...schemaPropsExclusiveness,
        }
      },
    },
    create: (context) => createRule(context, (optionGroup) => parseOptions(optionGroup, context))
  },
  'named-operations': {
    meta: {
      schema: {
        type: 'array',
        items: {
          additionalProperties: false,
          properties: { ...defaultRuleProperties },
          ...schemaPropsExclusiveness,
        },
      },
    },
    create: (context) => {
      return createRule(context, (optionGroup) => parseOptions({
        validators: ['OperationsMustHaveNames'],
        ...optionGroup,
      }, context));
    },
  },
  'required-fields': {
    meta: {
      schema: {
        type: 'array',
        minItems: 1,
        items: {
          additionalProperties: false,
          properties: {
            ...defaultRuleProperties,
            requiredFields: {
              type: 'array',
              items: {
                type: 'string',
              },
            },
          },
          required: ['requiredFields'],
          ...schemaPropsExclusiveness,
        },
      },
    },
    create: context => {
      return createRule(context, optionGroup =>
        parseOptions(
          {
            validators: ['RequiredFields'],
            options: { requiredFields: optionGroup.requiredFields },
            ...optionGroup,
          },
          context
        )
      );
    },
  },
  'capitalized-type-name': {
    meta: {
      schema: {
        type: 'array',
        items: {
          additionalProperties: false,
          properties: { ...defaultRuleProperties },
          ...schemaPropsExclusiveness,
        },
      },
    },
    create: (context) => {
      return createRule(context, (optionGroup) => parseOptions({
        validators: ['typeNamesShouldBeCapitalized'],
        ...optionGroup,
      }, context));
    },
  },
  'no-deprecated-fields': {
    meta: {
      schema: {
        type: 'array',
        items: {
          additionalProperties: false,
          properties: { ...defaultRuleProperties },
          ...schemaPropsExclusiveness,
        },
      },
    },
    create: (context) => {
      return createRule(context, (optionGroup) => parseOptions({
        validators: ['noDeprecatedFields'],
        ...optionGroup,
      }, context));
    },
  },
};

let schemaCache = {};

function parseOptions(optionGroup, context) {
  const cacheHit = schemaCache[JSON.stringify(optionGroup)];
  if (cacheHit) {
    return cacheHit;
  }
  const {
    schemaJson, // Schema via JSON object
    schemaJsonFilepath, // Or Schema via absolute filepath
    schemaString, // Or Schema as string,
    env,
    projectName,
    tagName: tagNameOption,
    validators: validatorNamesOption,
  } = optionGroup;

  // Validate and unpack schema
  let schema;
  if (schemaJson) {
    schema = initSchema(schemaJson);
  } else if (schemaJsonFilepath) {
    schema = initSchemaFromFile(schemaJsonFilepath);
  } else if (schemaString) {
    schema = initSchemaFromString(schemaString);
  } else {
    try {
      const config = getGraphQLConfig(path.dirname(context.getFilename()));
      let projectConfig;
      if (projectName) {
        projectConfig = config.getProjects()[projectName];
        if (!projectConfig) {
          throw new Error(`Project with name "${projectName}" not found in ${config.configPath}.`);
        }
      } else {
        projectConfig = config.getConfigForFile(context.getFilename());
      }
      schema = projectConfig.getSchema();
    } catch (e) {
      if (e instanceof ConfigNotFoundError) {
        throw new Error('Must provide .graphqlconfig file or pass in `schemaJson` option ' +
          'with schema object or `schemaJsonFilepath` with absolute path to the json file.');
      }
      throw e;
    }

  }

  // Validate env
  if (env && env !== 'lokka' && env !== 'fraql' && env !== 'relay' && env !== 'apollo' && env !== 'literal') {
    throw new Error('Invalid option for env, only `apollo`, `lokka`, `fraql`, `relay`, and `literal` supported.')
  }

  // Validate tagName and set default
  let tagName;
  if (tagNameOption) {
    tagName = tagNameOption;
  } else if (env === 'relay') {
    tagName = 'Relay.QL';
  } else if (env === 'literal') {
    tagName = internalTag;
  } else {
    tagName = 'gql';
  }

  // The validator list may be:
  //    The string 'all' to use all rules.
  //    An array of rule names.
  //    null/undefined to use the default rule set of the environment, or all rules.
  let validatorNames;
  if (validatorNamesOption === 'all') {
    validatorNames = allGraphQLValidatorNames;
  } else if (validatorNamesOption) {
    validatorNames = validatorNamesOption;
  } else {
    validatorNames = envGraphQLValidatorNames[env] || allGraphQLValidatorNames;
  }

  const validators = validatorNames.map(name => {
    if (name in customRules) {
      return customRules[name];
    } else {
      return require(`graphql/validation/rules/${name}`)[name];
    }
  });
  const results = {schema, env, tagName, validators};
  schemaCache[JSON.stringify(optionGroup)] = results;
  return results;
}

function initSchema(json) {
  const unpackedSchemaJson = json.data ? json.data : json;
  if (!unpackedSchemaJson.__schema) {
    throw new Error('Please pass a valid GraphQL introspection query result.');
  }
  return buildClientSchema(unpackedSchemaJson);
}

function initSchemaFromFile(jsonFile) {
  return initSchema(JSON.parse(fs.readFileSync(jsonFile, 'utf8')));
}

function initSchemaFromString(source) {
  return buildSchema(source)
}



export function clearSchemaCache() {
  schemaCache = {};
}

const gqlProcessor = {
  preprocess: function(text) {
    // Wrap the text in backticks and prepend the internal tag. First the text
    // must be escaped, because of the three sequences that have special
    // meaning in JavaScript template literals, and could change the meaning of
    // the text or cause syntax errors.
    // https://tc39.github.io/ecma262/#prod-TemplateCharacter
    //
    // - "`" would end the template literal.
    // - "\" would start an escape sequence.
    // - "${" would start an interpolation.
    const escaped = text.replace(/[`\\]|\$\{/g, '\\$&');
    return [`${internalTag}\`${escaped}\``];
  },
  postprocess: function(messages) {
    // only report graphql-errors
    return flatten(messages).filter((message) => {
      return includes(keys(rules).map((key) => `graphql/${key}`), message.ruleId);
    })
  }
}

export const processors = reduce(gqlFiles, (result, value) => {
    return { ...result, [`.${value}`]: gqlProcessor };
}, {})

export default {
  rules,
  processors,
  clearSchemaCache
}
