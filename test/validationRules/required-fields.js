import { rules } from "../../src";
import schemaJson from "../schema.json";

import { ruleTester, parserOptions } from "../helpers";

const requiredFieldsTestCases = {
  pass: [
    "const x = gql`query { allFilms { films { title } } }`",
    "const x = gql`query { stories { id comments { text } } }`",
    "const x = gql`query { greetings { id, hello, foo } }`",
    "const x = gql`query { greetings { hello ... on Greetings { id } } }`"
  ],
  fail: [
    {
      code: "const x = gql`query { stories { comments { text } } }`",
      errors: [
        {
          message: `'id' field required on 'stories'`,
          type: "TaggedTemplateExpression"
        }
      ]
    },
    {
      code: "const x = gql`query { greetings { hello } }`",
      errors: [
        {
          message: `'id' field required on 'greetings'`,
          type: "TaggedTemplateExpression"
        }
      ]
    },
    {
      code:
        "const x = gql`query { greetings { hello ... on Greetings { foo } } }`",
      errors: [
        {
          message: `'id' field required on 'greetings'`,
          type: "TaggedTemplateExpression"
        }
      ]
    },
    {
      code: 'const x = gql`query { greetings { hello ...GreetingsFragment} }`',
      errors: [
        {
          message: `'id' field required on 'greetings'`,
          type: 'TaggedTemplateExpression',
        },
      ],
    },
  ]
};

// Validate the required-fields rule with env specified
let options = [
  {
    schemaJson,
    env: "apollo",
    tagName: "gql",
    requiredFields: ["id"]
  }
];

ruleTester.run("testing required-fields rule", rules["required-fields"], {
  valid: requiredFieldsTestCases.pass.map(code => ({
    options,
    parserOptions,
    code
  })),
  invalid: requiredFieldsTestCases.fail.map(({ code, errors }) => ({
    options,
    parserOptions,
    code,
    errors
  }))
});

// Validate required-fields without optional env argument
options = [
  {
    schemaJson,
    tagName: "gql",
    requiredFields: ["id"]
  }
];
ruleTester.run("testing required-fields rule", rules["required-fields"], {
  valid: requiredFieldsTestCases.pass.map(code => ({
    options,
    parserOptions,
    code
  })),
  invalid: requiredFieldsTestCases.fail.map(({ code, errors }) => ({
    options,
    parserOptions,
    code,
    errors
  }))
});
