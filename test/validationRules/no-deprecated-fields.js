import { rules } from "../../src";
import schemaJson from "../schema.json";

import { ruleTester } from "../helpers";

const parser = require.resolve("@babel/eslint-parser");

const options = [
  {
    schemaJson,
    env: "relay",
  },
];

const noDeprecatedFieldsCases = {
  pass: [
    `
      @relay({
        fragments: {
          greetings: () => Relay.QL\`
            fragment on Greetings {
              hello,
            }
          \`,
        }
      })
      class HelloApp extends React.Component {}
    `,
    `
      @relay({
        fragments: {
          greetings: () => Relay.QL\`
            fragment on Greetings {
              image(size: LARGE) { size }
            }
          \`,
        }
      })
      class HelloApp extends React.Component {}
    `,
  ],
  fail: [
    {
      options,
      parser,
      code: `
        @relay({
          fragments: {
            greetings: () => Relay.QL\`
              fragment on Greetings {
                hi,
              }
            \`,
          }
        })
        class HelloApp extends React.Component {}
      `,
      errors: [
        {
          message:
            "The field Greetings.hi is deprecated. Please use the more formal greeting 'hello'",
          type: "TaggedTemplateExpression",
          line: 6,
          column: 17,
        },
      ],
    },
    {
      options,
      parser,
      code: `
        @relay({
          fragments: {
            greetings: () => Relay.QL\`
              fragment on Greetings {
                image(size: SMALL) { size }
              }
            \`,
          }
        })
        class HelloApp extends React.Component {}
      `,
      errors: [
        {
          message:
            "The enum value ImageSize.SMALL is deprecated. Use 'LARGE' instead",
          type: "TaggedTemplateExpression",
          line: 6,
          column: 29,
        },
      ],
    },
  ],
};

ruleTester.run(
  "testing no-deprecated-fields rule",
  rules["no-deprecated-fields"],
  {
    valid: noDeprecatedFieldsCases.pass.map((code) => ({
      options,
      parser,
      code,
    })),
    invalid: noDeprecatedFieldsCases.fail.map(({ code, errors }) => ({
      options,
      parser,
      code,
      errors,
    })),
  }
);
