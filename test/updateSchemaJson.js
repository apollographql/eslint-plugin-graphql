const fs = require("fs");
const path = require("path");
const graphql = require("graphql");
const process = require("process");

const isAtLeastGraphQL16 =
  graphql.versionInfo && graphql.versionInfo.major >= 16;

Promise.all(
  ["schema", "second-schema"].map((schemaName) => {
    const typeDefinition = fs.readFileSync(
      path.join(__dirname, schemaName + ".graphql"),
      "utf8"
    );
    const schema = graphql.buildASTSchema(graphql.parse(typeDefinition));

    const outputPath = path.join(__dirname, schemaName + ".json");
    const introspectionQuery = isAtLeastGraphQL16
      ? graphql.getIntrospectionQuery()
      : graphql.introspectionQuery;

    return graphql
      .graphql({ schema, source: introspectionQuery })
      .then((result) => {
        if (result.errors) {
          throw new Error("Failed introspecting schema: " + result.errors);
        } else {
          fs.writeFileSync(outputPath, JSON.stringify(result, null, 2));
        }
      });
  })
)
  .then(() => process.exit(0))
  .catch((e) => {
    console.error(e); // eslint-disable-line no-console
    process.exit(127);
  });
