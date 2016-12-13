import fs from 'fs';
import {
  parse,
  validate,
  buildClientSchema,
} from 'graphql';

import {
  flatten,
  keys,
  last,
  reduce,
  without,
} from 'lodash';

const graphQLValidationRuleNames = [
  'UniqueOperationNames',
  'LoneAnonymousOperation',
  'KnownTypeNames',
  'FragmentsOnCompositeTypes',
  'VariablesAreInputTypes',
  'ScalarLeafs',
  'FieldsOnCorrectType',
  'UniqueFragmentNames',
  //'KnownFragmentNames', -> any interpolation
  //'NoUnusedFragments', -> any standalone fragment
  'PossibleFragmentSpreads',
  'NoFragmentCycles',
  'UniqueVariableNames',
  'NoUndefinedVariables',
  'NoUnusedVariables',
  'KnownDirectives',
  'KnownArgumentNames',
  'UniqueArgumentNames',
  'ArgumentsOfCorrectType',
  'ProvidedNonNullArguments',
  'DefaultValuesOfCorrectType',
  'VariablesInAllowedPosition',
  'OverlappingFieldsCanBeMerged',
  'UniqueInputFieldNames',
];

// Omit these rules when in Relay env
const relayRuleNames = without(graphQLValidationRuleNames,
  'ScalarLeafs',
  'ProvidedNonNullArguments',
  'KnownDirectives',
  'NoUndefinedVariables',
);

const graphQLValidationRules = graphQLValidationRuleNames.map((ruleName) => {
  return require(`graphql/validation/rules/${ruleName}`)[ruleName];
});

const relayGraphQLValidationRules = relayRuleNames.map((ruleName) => {
  return require(`graphql/validation/rules/${ruleName}`)[ruleName];
});

const internalTag = 'ESLintPluginGraphQLFile';
const gqlFiles = ['gql', 'graphql'];

const rules = {
  'template-strings': {
    meta: {
      schema: {
        type: 'array',
        minLength: 1,
        items: {
          additionalProperties: false,
          properties: {
            schemaJson: {
              type: 'object',
            },
            schemaJsonFilepath: {
              type: 'string',
            },
            env: {
              enum: [
                'lokka',
                'relay',
                'apollo',
              ],
            },
            tagName: {
              type: 'string',
              pattern: '^[$_a-zA-Z$_][a-zA-Z0-9$_]+(\\.[a-zA-Z0-9$_]+)?$',
            },
          },
          // schemaJson and schemaJsonFilepath are mutually exclusive:
          oneOf: [{
            required: ['schemaJson'],
            not: { required: ['schemaJsonFilepath'], },
          }, {
            required: ['schemaJsonFilepath'],
            not: { required: ['schemaJson'], },
          }],
        }
      },
    },
    create(context) {
      const tagNames = new Set();
      const tagRules = [];
      for (const optionGroup of context.options) {
        const {schema, env, tagName} = parseOptions(optionGroup);
        if (tagNames.has(tagName)) {
          throw new Error('Multiple options for GraphQL tag ' + tagName);
        }
        tagNames.add(tagName);
        tagRules.push({schema, env, tagName});
      }
      return {
        TaggedTemplateExpression(node) {
          for (const {schema, env, tagName} of tagRules) {
            if (templateExpressionMatchesTag(tagName, node)) {
              return handleTemplateTag(node, context, schema, env);
            }
          }
        },
      };
    },
  },
};

function parseOptions(optionGroup) {
  const {
    schemaJson, // Schema via JSON object
    schemaJsonFilepath, // Or Schema via absolute filepath
    env,
    tagName: tagNameOption,
  } = optionGroup;

  // Validate and unpack schema
  let schema;
  if (schemaJson) {
    schema = initSchema(schemaJson);
  } else if (schemaJsonFilepath) {
    schema = initSchemaFromFile(schemaJsonFilepath);
  } else {
    throw new Error('Must pass in `schemaJson` option with schema object '
                  + 'or `schemaJsonFilepath` with absolute path to the json file.');
  }

  // Validate env
  if (env && env !== 'lokka' && env !== 'relay' && env !== 'apollo' && env != 'literal') {
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
  return {schema, env, tagName};
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

function handleTemplateTag(node, context, schema, env) {
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

  const rules = (env === 'relay' ? relayGraphQLValidationRules : graphQLValidationRules);

  const validationErrors = schema ? validate(schema, ast, rules) : [];

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
  const location = error.locations[0];

  let line;
  let column;
  if (location.line === 1) {
    line = node.loc.start.line;
    column = node.loc.start.col + location.col;
  } else {
    line = node.loc.start.line + location.line;
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

    chunks.push(chunk);

    if (!element.tail) {
      const value = node.expressions[i];

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

  return chunks.join('').trim();
}

function strWithLen(len) {
  // from http://stackoverflow.com/questions/14343844/create-a-string-of-variable-length-filled-with-a-repeated-character
  return new Array(len + 1).join( 'x' );
}

const gqlProcessor = {
  preprocess: function(text) {
    const escaped = text.replace(/`/g, '\\`');

    return [`${internalTag}\`${escaped}\``];
  },
  postprocess: function(messages) {
    // only report graphql-errors
    return flatten(messages).filter((message) => {
      return keys(rules).map((key) => `graphql/${key}`).includes(message.ruleId);
    })
  }
}

const processors = reduce(gqlFiles, (result, value) => {
    return { ...result, [`.${value}`]: gqlProcessor };
}, {})

module.exports = {
  rules,
  processors
};
