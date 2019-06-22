import schemaJson from "../schema.json";
import { includes, values, entries } from "lodash";

import {
  requiredArgumentRuleName,
  rule,
  ruleTester,
  parserOptions
} from "../helpers";

const validatorCases = {
  FieldsOnCorrectType: {
    pass: "const x = gql`{ allFilms { films { title } } }`",
    fail: "const x = gql`{ allFilms { films { greetings } } }`",
    errors: [
      {
        message: 'Cannot query field "greetings" on type "Film".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  FragmentsOnCompositeTypes: {
    pass: "const x = gql`{ allFilms { films { ...on Film { title } } } }`",
    fail: "const x = gql`{ allFilms { films { ...on String { foo } } } }`",
    alsoBreaks: ["PossibleFragmentSpreads"],
    errors: [
      {
        message: 'Fragment cannot condition on non composite type "String".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  KnownArgumentNames: {
    pass: "const x = gql`{ sum(a: 1, b: 2) }`",
    fail: "const x = gql`{ sum(c: 1, d: 2) }`",
    alsoBreaks: [requiredArgumentRuleName],
    errors: [
      {
        message:
          'Unknown argument "c" on field "sum" of type "Query". Did you mean "a" or "b"?',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  KnownDirectives: {
    pass:
      "const x = gql`{ number, allFilms @include(if: false) { films { title } } }`",
    fail:
      "const x = gql`{ number, allFilms @goofy(if: false) { films { title } } }`",
    errors: [
      {
        message: 'Unknown directive "goofy".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  KnownFragmentNames: {
    pass:
      "const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`",
    fail: "const x = gql`{ allFilms { films { ...FilmFragment } } }`",
    errors: [
      {
        message: 'Unknown fragment "FilmFragment".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  KnownTypeNames: {
    pass:
      "const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`",
    fail:
      "const x = gql`fragment FilmFragment on Floof { title } { allFilms { films { ...FilmFragment } } }`",
    errors: [
      {
        message: /Unknown type "Floof"/,
        type: "TaggedTemplateExpression"
      }
    ]
  },
  LoneAnonymousOperation: {
    pass: "const x = gql`{ number }`",
    fail: "const x = gql`{ number } { number }`",
    errors: [
      {
        message: "This anonymous operation must be the only defined operation.",
        type: "TaggedTemplateExpression"
      }
    ]
  },

  // This causes a `RangeError: Maximum call stack size exceeded` exception in graphql 0.8.x
  // 'NoFragmentCycles': {
  //   pass: 'const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`',
  //   fail: 'const x = gql`fragment FilmFragment on Film { title, ...FilmFragment } { allFilms { films { ...FilmFragment } } }`',
  //   errors: [{
  //     message: 'Cannot spread fragment "FilmFragment" within itself.',
  //     type: 'TaggedTemplateExpression',
  //   }],
  // },

  NoUndefinedVariables: {
    pass: "const x = gql`query($a: Int!) { sum(a: $a, b: 1) }`",
    fail: "const x = gql`query($a: Int!) { sum(a: $a, b: $b) }`",
    errors: [
      {
        message: 'Variable "$b" is not defined.',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  NoUnusedFragments: {
    pass:
      "const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`",
    fail:
      "const x = gql`fragment FilmFragment on Film { title } { allFilms { films { title } } }`",
    errors: [
      {
        message: 'Fragment "FilmFragment" is never used.',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  NoUnusedVariables: {
    pass: "const x = gql`query($a: Int!) { sum(a: $a, b: 1) }`",
    fail: "const x = gql`query($a: Int!) { sum(a: 1, b: 1) }`",
    errors: [
      {
        message: 'Variable "$a" is never used.',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  OverlappingFieldsCanBeMerged: {
    pass:
      "const x = gql`fragment Sum on Query { sum(a: 1, b: 2) } { ...Sum, sum(a: 1, b: 2) }`",
    fail:
      "const x = gql`fragment Sum on Query { sum(a: 1, b: 2) } { ...Sum, sum(a: 2, b: 3) }`",
    errors: [
      {
        message:
          'Fields "sum" conflict because they have differing arguments. Use different aliases on the fields to fetch both if this was intentional.',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  PossibleFragmentSpreads: {
    pass:
      "const x = gql`fragment FilmFragment on Film { title } { allFilms { films { ...FilmFragment } } }`",
    fail:
      "const x = gql`fragment FilmFragment on Film { title } { greetings { ...FilmFragment } }`",
    errors: [
      {
        message:
          'Fragment "FilmFragment" cannot be spread here as objects of type "Greetings" can never be of type "Film".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  [requiredArgumentRuleName]: {
    pass: "const x = gql`{ sum(a: 1, b: 2) }`",
    fail: "const x = gql`{ sum(a: 1) }`",
    errors: [
      {
        message:
          /Field "sum" argument "b" of type "Int!" is required/,
        type: "TaggedTemplateExpression"
      }
    ]
  },
  ScalarLeafs: {
    pass: "const x = gql`{ number }`",
    fail: "const x = gql`{ allFilms }`",
    errors: [
      {
        message:
          'Field "allFilms" of type "AllFilmsObj" must have a selection of subfields. Did you mean "allFilms { ... }"?',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  UniqueArgumentNames: {
    pass: "const x = gql`{ sum(a: 1, b: 2) }`",
    fail: "const x = gql`{ sum(a: 1, a: 2) }`",
    alsoBreaks: [requiredArgumentRuleName],
    errors: [
      {
        message: 'There can be only one argument named "a".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  UniqueFragmentNames: {
    pass:
      "const x = gql`fragment FF1 on Film { title } fragment FF2 on Film { director } { allFilms { films { ...FF1, ...FF2 } } }`",
    fail:
      "const x = gql`fragment FF on Film { title } fragment FF on Film { director } { allFilms { films { ...FF } } }`",
    errors: [
      {
        message: 'There can be only one fragment named "FF".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  UniqueInputFieldNames: {
    pass:
      'const x = gql`mutation { createComment(input: { stuff: "Yay" }) { story { id } } }`',
    fail:
      'const x = gql`mutation { createComment(input: { stuff: "Yay", stuff: "No" }) { story { id } } }`',
    errors: [
      {
        message: 'There can be only one input field named "stuff".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  UniqueOperationNames: {
    pass:
      "const x = gql`query Q1 { sum(a: 1, b: 2) } query Q2 { sum(a: 2, b: 3) }`",
    fail:
      "const x = gql`query Q { sum(a: 1, b: 2) } query Q { sum(a: 2, b: 3) }`",
    errors: [
      {
        message: 'There can be only one operation named "Q".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  UniqueVariableNames: {
    pass: "const x = gql`query($a: Int!, $b: Int!) { sum(a: $a, b: $b) }`",
    fail: "const x = gql`query($a: Int!, $a: Int!) { sum(a: $a, b: $a) }`",
    errors: [
      {
        message: 'There can be only one variable named "a".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  VariablesAreInputTypes: {
    pass: "const x = gql`query($a: Int!, $b: Int!) { sum(a: $a, b: $b) }`",
    fail: "const x = gql`query($a: Film!) { sum(a: 1, b: 1) }`",
    alsoBreaks: ["NoUnusedVariables"],
    errors: [
      {
        message: 'Variable "$a" cannot be non-input type "Film!".',
        type: "TaggedTemplateExpression"
      }
    ]
  },
  VariablesInAllowedPosition: {
    pass: "const x = gql`query($a: Int!) { sum(a: $a, b: 1) }`",
    fail: "const x = gql`query($a: String!) { sum(a: $a, b: 1) }`",
    errors: [
      {
        message:
          'Variable "$a" of type "String!" used in position expecting type "Int!".',
        type: "TaggedTemplateExpression"
      }
    ]
  }
};

{
  let options = [
    {
      schemaJson,
      tagName: "gql",
      validators: "all"
    }
  ];
  ruleTester.run("enabled all validators", rule, {
    valid: values(validatorCases).map(({ pass: code }) => ({
      options,
      parserOptions,
      code
    })),
    invalid: values(validatorCases).map(({ fail: code, errors }) => ({
      options,
      parserOptions,
      code,
      errors
    }))
  });

  options = [
    {
      schemaJson,
      tagName: "gql",
      validators: []
    }
  ];
  ruleTester.run("disabled all validators", rule, {
    valid: []
      .concat(
        values(validatorCases).map(({ pass: code }) => code),
        values(validatorCases).map(({ fail: code }) => code)
      )
      .map(code => ({ options, parserOptions, code })),
    invalid: []
  });

  // Check that when only a given validation is enabled, it's the only thing
  // that can fail. (Excluding test cases that include this validation rule as
  // 'alsoBreaks'…sometimes it's hard to make a test that fails exactly one
  // validator).
  for (const [validatorName, { fail, errors }] of entries(validatorCases)) {
    options = [
      {
        schemaJson,
        tagName: "gql",
        validators: [validatorName]
      }
    ];
    const otherValidators = entries(validatorCases)
      .filter(
        ([otherValidatorName, { alsoBreaks }]) =>
          otherValidatorName !== validatorName &&
          !includes(alsoBreaks || [], validatorName)
      )
      .map(kvPair => kvPair[1]);
    ruleTester.run(`enabled only ${validatorName} validator`, rule, {
      valid: []
        .concat(
          values(validatorCases).map(({ pass: code }) => code),
          otherValidators.map(({ fail: code }) => code)
        )
        .map(code => ({ options, parserOptions, code })),
      invalid: [{ options, parserOptions, errors, code: fail }]
    });
  }
}
