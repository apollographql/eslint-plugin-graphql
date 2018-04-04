import fs from 'fs';
import path from 'path';
import {
  parse,
  validate,
  buildClientSchema,
  buildSchema,
  specifiedRules as allGraphQLValidators
} from 'graphql';

import {
  flatten,
  keys,
  last,
  reduce,
  without,
  includes,
} from 'lodash';

import { getGraphQLConfig, ConfigNotFoundError } from 'graphql-config';

import * as customRules from './rules';

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
  relay: without(allGraphQLValidatorNames,
    'KnownDirectives',
    'KnownFragmentNames',
    'NoUndefinedVariables',
    'NoUnusedFragments',
    'ProvidedNonNullArguments',
    'ScalarLeafs',
  ),
  literal: without(allGraphQLValidatorNames,
    'KnownFragmentNames',
    'NoUnusedFragments',
  ),
};

const internalTag = 'ESLintPluginGraphQLFile';
const gqlFiles = ['gql', 'graphql'];

const defaultRuleProperties = {
  env: {
    enum: [
      'lokka',
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

function createRule(context, optionParser) {
  const tagNames = new Set();
  const tagRules = [];
  const options = context.options.length === 0 ? [{}] : context.options;
  for (const optionGroup of options) {
    const {schema, env, tagName, validators} = optionParser(optionGroup);
    const boundValidators = validators.map(v => (ctx) => v(ctx, optionGroup));
    if (tagNames.has(tagName)) {
      throw new Error('Multiple options for GraphQL tag ' + tagName);
    }
    tagNames.add(tagName);
    tagRules.push({schema, env, tagName, validators: boundValidators});
  }

  return {
    TaggedTemplateExpression(node) {
      for (const {schema, env, tagName, validators} of tagRules) {
        if (templateExpressionMatchesTag(tagName, node)) {
          return handleTemplateTag(node, context, schema, env, validators);
        }
      }
    },
  };
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

const schemaCache = {};

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
  if (env && env !== 'lokka' && env !== 'relay' && env !== 'apollo' && env !== 'literal') {
    throw new Error('Invalid option for env, only `apollo`, `lokka`, `relay`, and `literal` supported.')
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

function templateExpressionMatchesTag(tagName, node) {
  const tagNameSegments = tagName.split('.').length;
  if (tagNameSegments === 1) {
    // Check for single identifier, like 'gql'
    if (node.tag.type !== 'Identifier' || node.tag.name !== tagName) {
      return false;
    }
  } else if (tagNameSegments === 2) {
    // Check for dotted identifier, like 'Relay.QL'
    if (node.tag.type !== 'MemberExpression' ||
        node.tag.object.name + '.' + node.tag.property.name !== tagName) {
      return false;
    }
  } else {
    // We don't currently support 3 segments so ignore
    return false;
  }
  return true;
}

function handleTemplateTag(node, context, schema, env, validators) {
  let text;
  try {
    text = replaceExpressions(node.quasi, context, env);
  } catch (e) {
    if (e.message !== 'Invalid interpolation') {
      console.log(e);
    }
    return;
  }

  // Re-implement syntax sugar for fragment names, which is technically not valid
  // graphql
  if ((env === 'lokka' || env === 'relay') && /fragment\s+on/.test(text)) {
    text = text.replace('fragment', `fragment _`);
  }

  let ast;

  try {
    ast = parse(text);
  } catch (error) {
    context.report({
      node,
      message: error.message.split('\n')[0],
      loc: locFrom(node, error),
    });
    return;
  }

  const validationErrors = schema ? validate(schema, ast, validators) : [];
  if (validationErrors && validationErrors.length > 0) {
    context.report({
      node,
      message: validationErrors[0].message,
      loc: locFrom(node, validationErrors[0]),
    });
    return;
  }
}

function locFrom(node, error) {
  if (!error.locations || !error.locations.length) {
    return;
  }
  const location = error.locations[0];

  let line;
  let column;
  if (location.line === 1 && node.tag.name !== internalTag) {
    line = node.loc.start.line;
    column = node.tag.loc.end.column + location.column;
  } else {
    line = node.loc.start.line + location.line - 1;
    column = location.column - 1;
  }

  return {
    line,
    column,
  };
}

function replaceExpressions(node, context, env) {
  const chunks = [];

  node.quasis.forEach((element, i) => {
    const chunk = element.value.cooked;
    const value = node.expressions[i];

    chunks.push(chunk);

    if (!env || env === 'apollo') {
      // In Apollo, interpolation is only valid outside top-level structures like `query` or `mutation`.
      // We'll check to make sure there's an equivalent set of opening and closing brackets, otherwise
      // we're attempting to do an invalid interpolation.
      if ((chunk.split('{').length - 1) !== (chunk.split('}').length - 1)) {
        context.report({
          node: value,
          message: 'Invalid interpolation - fragment interpolation must occur outside of the brackets.',
        });
        throw new Error('Invalid interpolation');
      }
    }

    if (!element.tail) {
      // Preserve location of errors by replacing with exactly the same length
      const nameLength = value.end - value.start;

      if (env === 'relay' && /:\s*$/.test(chunk)) {
        // The chunk before this one had a colon at the end, so this
        // is a variable

        // Add 2 for brackets in the interpolation
        const placeholder = strWithLen(nameLength + 2)
        chunks.push('$' + placeholder);
      } else if (env === 'lokka' && /\.\.\.\s*$/.test(chunk)) {
        // This is Lokka-style fragment interpolation where you actually type the '...' yourself
        const placeholder = strWithLen(nameLength + 3);
        chunks.push(placeholder);
      } else if (env === 'relay') {
        // This is Relay-style fragment interpolation where you don't type '...'
        // Ellipsis cancels out extra characters
        const placeholder = strWithLen(nameLength);
        chunks.push('...' + placeholder);
      } else if (!env || env === 'apollo') {
        // In Apollo, fragment interpolation is only valid outside of brackets
        // Since we don't know what we'd interpolate here (that occurs at runtime),
        // we're not going to do anything with this interpolation.
      } else {
        // Invalid interpolation
        context.report({
          node: value,
          message: 'Invalid interpolation - not a valid fragment or variable.',
        });
        throw new Error('Invalid interpolation');
      }
    }
  });

  return chunks.join('');
}

function strWithLen(len) {
  // from http://stackoverflow.com/questions/14343844/create-a-string-of-variable-length-filled-with-a-repeated-character
  return new Array(len + 1).join( 'x' );
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
  processors
}
