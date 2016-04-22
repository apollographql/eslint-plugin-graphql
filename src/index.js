import {
  parse,
  validate,
  buildClientSchema,
} from 'graphql';


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
        if (node.tag.name !== tagName) {
          return;
        }

        if (node.quasi.quasis.length > 1) {
          context.report({
            node,
            message: 'Unexpected interpolation in GraphQL template string.',
          });

          return;
        }

        const text = node.quasi.quasis[0].value.cooked;

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

        const validationErrors = schema ? validate(schema, ast) : [];

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
    line = node.loc.start.line + location.line - 1;
    column = location.column - 1;
  }

  return {
    line,
    column,
  };
}


export { rules };
