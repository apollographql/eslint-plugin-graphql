import { rules } from "../../src";
import schemaJson from "../schema.json";

import { ruleTester, parserOptions } from "../helpers";

const typeNameCapValidatorCases = {
  pass: [
    "const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`",
    "const x = gql`query { someUnion {... on SomeUnionMember { someField }}}`"
  ],
  fail: [
    {
      code:
        "const x = gql`fragment FilmFragment on film { title } { allFilms { films { ...FilmFragment } } }`",
      errors: [
        {
          message: "All type names should start with a capital letter",
          type: "TaggedTemplateExpression"
        }
      ]
    },
    {
      code:
        "const x = gql`query { someUnion {... on someUnionMember { someField }}}`",
      errors: [
        {
          message: "All type names should start with a capital letter",
          type: "TaggedTemplateExpression"
        }
      ]
    }
  ]
};

const options = [
  {
    schemaJson,
    tagName: "gql"
  }
];
ruleTester.run(
  "testing capitalized-type-name rule",
  rules["capitalized-type-name"],
  {
    valid: typeNameCapValidatorCases.pass.map(code => ({
      options,
      parserOptions,
      code
    })),
    invalid: typeNameCapValidatorCases.fail.map(({ code, errors }) => ({
      options,
      parserOptions,
      code,
      errors
    }))
  }
);
