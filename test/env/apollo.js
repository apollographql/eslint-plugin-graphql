import { isAtLeastGraphQL15 } from "../helpers";
import schemaJson from "../schema.json";

import { rule, ruleTester, parserOptions } from "../helpers";

const options = [{ schemaJson, env: "apollo" }];

ruleTester.run("apollo", rule, {
  valid: [
    {
      options,
      parserOptions,
      code: "const x = gql`{ number } ${x}`",
    },
  ],
  invalid: [
    {
      options,
      parserOptions,
      code: "const x = gql`query { ${x} }`",
      errors: [
        {
          message:
            "Invalid interpolation - fragment interpolation must occur outside of the brackets.",
          type: "Identifier",
        },
      ],
    },
    {
      options,
      parserOptions,
      code: "const x = gql`query }{ ${x}`",
      errors: [
        {
          message: isAtLeastGraphQL15
            ? 'Syntax Error: Expected "{", found "}".'
            : "Syntax Error: Expected {, found }",
          type: "TaggedTemplateExpression",
        },
      ],
    },
  ],
});
