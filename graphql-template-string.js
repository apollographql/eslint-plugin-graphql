import {
  parse,
  buildASTSchema,
  validate,
} from 'graphql';

const typeDefinition = `
  schema {
    query: RootQuery
  }

  type RootQuery {
    aNumber: Int
}
`;

const schema = buildASTSchema(parse(typeDefinition));

//------------------------------------------------------------------------------
// Rule Definition
//------------------------------------------------------------------------------

module.exports = function(context) {
  // variables should be defined here

  //--------------------------------------------------------------------------
  // Helpers
  //--------------------------------------------------------------------------

  // any helper functions should go here or else delete this section

  //--------------------------------------------------------------------------
  // Public
  //--------------------------------------------------------------------------

  return {
    TaggedTemplateExpression(node) {
      if (node.tag.name !== 'gql') {
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

        context.report({
          node,
          message: error.message.split('\n')[0],
          loc: {
            line,
            col,
          },
        });
        return;
      }

      const validationError = schema ? validate(schema, ast) : [];

      console.log(validationError);
    }
  };
};

module.exports.schema = [
    // fill in your schema
];
