import { rules } from "../../src";
import schemaJson from "../schema.json";

import { ruleTester, parserOptions } from "../helpers";

const capitalizedNamedOperationsValidatorCases = {
  pass: [
    "const x = gql`query Test { sum(a: 1, b: 2) }`",
    "const x = gql`query { sum(a: 1, b: 2) }`",
  ],
  fail: [{
    code: "const x = gql`query test { sum(a: 1, b: 2) }`",
    errors: [
      {
        message: "All operations must be capitalized",
        type: "TaggedTemplateExpression"
      }
    ]
  }]
};

// Validate the named-operations rule
const options = [
  {
    schemaJson,
    tagName: "gql"
  }
];
ruleTester.run("testing capitalized-named-operations rule", rules["capitalized-named-operations"], {
  valid: capitalizedNamedOperationsValidatorCases.pass.map(code => ({
    options,
    parserOptions,
    code
    })),
  invalid: capitalizedNamedOperationsValidatorCases.fail.map(({ code, errors }) => ({
    options,
    parserOptions,
    code,
    errors
  }))
});
