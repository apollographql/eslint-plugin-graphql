import { rules } from "../../src";
import schemaJson from "../schema.json";

import { ruleTester, parserOptions } from "../helpers";

const requiredFieldsTestCases = {
  pass: [
    "const x = gql`query { allFilms { films { title } } }`",
    "const x = gql`query { stories { id comments { text } } }`",
    "const x = gql`query { greetings { id, hello, hi } }`",
    "const x = gql`query { greetings { id, hello, foo } }`",
    "const x = gql`query { greetings { id ... on Greetings { hello } } }`",
    "const x = gql`fragment Name on Greetings { id hello }`",
    "const x = gql`fragment Foo on FooBar { id, hello, foo }`",
    "const x = gql`fragment Id on Node { id ... on NodeA { fieldA } }`",
    "const x = gql`query { nodes { id ... on NodeA { fieldA } } }`",
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
        "const x = gql`query { greetings { hello ... on Greetings { hello } } }`",
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
    {
      code: 'const x = gql`fragment Name on Greetings { hello }`',
      errors: [
        {
          message: `'id' field required on 'fragment Name on Greetings'`,
          type: 'TaggedTemplateExpression',
        },
      ],
    },
    {
      code:
        "const x = gql`query { greetingOrStory { ... on Greetings { id } ... on Story { comments { text } } } }`",
      errors: [
        {
          message: `'id' field required on '... on Story'`,
          type: "TaggedTemplateExpression"
        }
      ]
    },
    {
      code:
        "const x = gql`query { nodes { ... on NodeA { id fieldA } ... on NodeB { id fieldB }}}`",
      errors: [
        {
          message: `'id' field required on 'nodes'`,
          type: "TaggedTemplateExpression"
        }
      ]
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

ruleTester.run("testing required-fields rule with env", rules["required-fields"], {
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
ruleTester.run("testing required-fields rule without env", rules["required-fields"], {
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
