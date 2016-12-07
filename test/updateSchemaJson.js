const fs = require('fs');
const path = require('path');
const graphql = require('graphql');
const process = require('process');

Promise.all(['schema', 'second-schema'].map(schemaName => {
  const typeDefinition = fs.readFileSync(path.join(__dirname, schemaName + '.graphql'), 'utf8');
  const schema = graphql.buildASTSchema(graphql.parse(typeDefinition));
  const outputPath = path.join(__dirname, schemaName + '.json');

  return graphql.graphql(schema, graphql.introspectionQuery)
    .then(result => fs.writeFileSync(outputPath, JSON.stringify(result, null, 2)));
}))
.then(() => process.exit(0))
.catch(e => {
  console.error(e);
  process.exit(127);
});
