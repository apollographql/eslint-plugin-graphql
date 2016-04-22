import {
  parse,
  validate,
} from 'graphql';

export function makeRule({
  schema,
  tagName = 'gql',
}) {
  return function (context) {
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
        }
      }
    };
  }
}

function locFrom(node, error) {
  const location = error.locations[0];

  let line;
  let col;
  if (location.line === 1) {
    line = node.loc.start.line;
    col = node.loc.start.col + location.col + 1;
  } else {
    line = node.loc.start.line + location.line - 1;
    col = location.col;
  }

  return {
    line,
    col,
  };
}
