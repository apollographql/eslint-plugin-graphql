import {
  parse,
  validate,
  buildClientSchema,
} from 'graphql';

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

const graphQLValidationRules = graphQLValidationRuleNames.map((ruleName) => {
  return require(`graphql/validation/rules/${ruleName}`)[ruleName];
});

const rules = {
  'template-strings'(context) {
    const { schemaJson, tagName = 'gql' } = context.options[0];

    if (! schemaJson) {
      throw new Error('Must pass in schemaJson option.');
    }

    const unpackedSchemaJson = schemaJson.data ? schemaJson.data : schemaJson;

    if (! unpackedSchemaJson.__schema) {
      throw new Error('Please pass a valid GraphQL introspection query result.');
    }

    const schema = buildClientSchema(unpackedSchemaJson);

    return {
      TaggedTemplateExpression(node) {
        const tagNameSegments = tagName.split('.').length;
        if (tagNameSegments === 1) {
          // Check for single identifier, like 'gql'
          if (node.tag.type === 'Identifier' && node.tag.name !== tagName) {
            return;
          }
        } else if (tagNameSegments === 2){
          // Check for dotted identifier, like 'Relay.QL'
          if (node.tag.type === 'MemberExpression' &&
              node.tag.object.name + '.' + node.tag.property.name !== tagName) {
            return;
          }
        }

        let text = replaceExpressions(node.quasi);

        // XXX special case for Lokka automatic fragment naming
        let fragmentNum = 1;
        if (/fragment\s+on/.test(text)) {
          text = text.replace('fragment', `fragment ${'a' + fragmentNum}`);
          fragmentNum++;
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

        const validationErrors = schema ? validate(schema, ast, graphQLValidationRules) : [];

        if (validationErrors && validationErrors.length > 0) {
          context.report({
            node,
            message: validationErrors[0].message,
            loc: locFrom(node, validationErrors[0]),
          });
          return;
        }
      }
    };
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

function replaceExpressions(node) {
  const chunks = [];

  node.quasis.forEach((element, i) => {
    const chunk = element.value.cooked;

    chunks.push(chunk);

    if (!element.tail) {
      const value = node.expressions[i];

      // Preserve location of errors by replacing with exactly the same length
      const nameLength = value.end - value.start;

      if (/:\s*$/.test(chunk)) {
        // The chunk before this one had a colon at the end, so this
        // is a variable

        // Add 2 for brackets in the interpolation
        const placeholder = strWithLen(nameLength + 2)
        chunks.push('$' + placeholder);
      } else {
        // Otherwise this interpolation is a fragment

        if (/...\s*$/.test(chunk)) {
          // This is Lokka-style fragment interpolation where you actually type the '...' yourself
          const placeholder = strWithLen(nameLength + 3);
          chunks.push(placeholder);
        } else {
          // This is Relay-style fragment interpolation where you don't type '...'
          // Ellipsis cancels out extra characters
          const placeholder = strWithLen(nameLength);
          chunks.push('...' + placeholder);
        }
      }
    }
  });

  return chunks.join('').trim();
}

function strWithLen(len) {
  // from http://stackoverflow.com/questions/14343844/create-a-string-of-variable-length-filled-with-a-repeated-character
  return new Array(len + 1).join( 'x' );
}

export { rules };
