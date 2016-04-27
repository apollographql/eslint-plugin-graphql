var fs = require('fs');
var path = require('path');
var graphql = require('graphql');

var typeDefinition = fs.readFileSync(path.join(__dirname, 'schema.graphql'), 'utf8');
var schema = graphql.buildASTSchema(graphql.parse(typeDefinition));

var addResolveFunctionsToSchema = require('graphql-tools').addResolveFunctionsToSchema;

var resolveFunctions = {
  RootQuery: {
    deprecatedQuery: {
      __deprecationReason: "This field is deprecated. Why? Just because.",
    },
  },
};

addResolveFunctionsToSchema(schema, resolveFunctions);

graphql.graphql(schema, graphql.introspectionQuery).then(function (result) {
  fs.writeFileSync(path.join(__dirname, 'schema.json'),
    JSON.stringify(result, null, 2));
});
