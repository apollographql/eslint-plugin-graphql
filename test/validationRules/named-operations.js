import { rules } from "../../src";
import schemaJson from "../schema.json";

import { ruleTester, parserOptions } from "../helpers";

const namedOperationsValidatorCases = {
  OperationsMustHaveNames: {
    pass: "const x = gql`query Test { sum(a: 1, b: 2) }`",
    fail: "const x = gql`query { sum(a: 1, b: 2) }`",
    errors: [
      {
        message: "All operations must be named",
        type: "TaggedTemplateExpression"
      }
    ]
  }
};

// Validate the named-operations rule
const options = [
  {
    schemaJson,
    tagName: "gql"
  }
];
ruleTester.run("testing named-operations rule", rules["named-operations"], {
  valid: Object.values(namedOperationsValidatorCases).map(({ pass: code }) => ({
    options,
    parserOptions,
    code
  })),
  invalid: Object.values(namedOperationsValidatorCases).map(
    ({ fail: code, errors }) => ({ options, parserOptions, code, errors })
  )
});
