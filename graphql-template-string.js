import {
  parse,
  buildASTSchema,
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

        // give me methods

    };

};

module.exports.schema = [
    // fill in your schema
];
