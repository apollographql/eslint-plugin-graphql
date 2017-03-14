# eslint-plugin-graphql

[![npm version](https://badge.fury.io/js/eslint-plugin-graphql.svg)](https://badge.fury.io/js/eslint-plugin-graphql)
[![Build Status](https://travis-ci.org/apollographql/eslint-plugin-graphql.svg?branch=master)](https://travis-ci.org/apollographql/eslint-plugin-graphql)
[![Get on Slack](https://img.shields.io/badge/slack-join-orange.svg)](http://www.apollostack.com/#slack)

An ESLint plugin that checks tagged query strings inside JavaScript or queries inside `.graphql` files against a GraphQL schema.

```
npm install eslint-plugin-graphql
```

![Screenshot from Atom](https://github.com/apollostack/eslint-plugin-graphql/raw/master/screenshot.png)

Has built-in settings for three GraphQL clients out of the box:

1. [Apollo client](http://docs.apollostack.com/apollo-client/index.html)
2. [Relay](https://facebook.github.io/relay/)
3. [Lokka](https://github.com/kadirahq/lokka)

### Importing schema JSON

You'll need to import your [introspection query result](https://github.com/graphql/graphql-js/blob/master/src/utilities/introspectionQuery.js). This can be done if you define your ESLint config in a JS file. Note: we're always looking for better ways to get the schema, so please open an issue with suggestions.

### Identity template literal tag

This plugin relies on GraphQL queries being prefixed with a special tag. In Relay and Apollo, this is always done, but other clients often take query strings without a tag. In this case, you can define an identity tag that doesn't do anything except for tell the linter this is a GraphQL query:

```js
global.gql = (literals, ...substitutions) => {
    let result = "";

    // run the loop only for the substitution count
    for (let i = 0; i < substitutions.length; i++) {
        result += literals[i];
        result += substitutions[i];
    }

    // add the last literal
    result += literals[literals.length - 1];

    return result;
}
```

Code snippet taken from:  <https://leanpub.com/understandinges6/read#leanpub-auto-multiline-strings>

Note: The linter rule could be extended to identify calls to various specific APIs to eliminate the need for a template literal tag, but this might just make the implementation a lot more complex for little benefit.

### GraphQL literal files

This plugin also lints GraphQL literal files ending on `.gql` or `.graphql`.
In order to do so set `env` to `'literal'` in your `.eslintrc.js` and tell eslint to check these files as well.

```bash
eslint . --ext .js --ext .gql --ext .graphql
```

### Example config for Apollo

```js
// In a file called .eslintrc.js
module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      // Import default settings for your GraphQL client. Supported values:
      // 'apollo', 'relay', 'lokka', 'literal'
      env: 'apollo',

      // Import your schema JSON here
      schemaJson: require('./schema.json'),

      // OR provide absolute path to your schema JSON
      // schemaJsonFilepath: path.resolve(__dirname, './schema.json'),

      // tagName is gql by default
    }]
  },
  plugins: [
    'graphql'
  ]
}
```

### Example config for Relay

```js
// In a file called .eslintrc.js
module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      // Import default settings for your GraphQL client. Supported values:
      // 'apollo', 'relay', 'lokka', 'literal'
      env: 'relay',

      // Import your schema JSON here
      schemaJson: require('./schema.json'),

      // OR provide absolute path to your schema JSON
      // schemaJsonFilepath: path.resolve(__dirname, './schema.json'),

      // tagName is set for you to Relay.QL
    }]
  },
  plugins: [
    'graphql'
  ]
}
```

### Example config for Lokka

```js
// In a file called .eslintrc.js
module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      // Import default settings for your GraphQL client. Supported values:
      // 'apollo', 'relay', 'lokka', 'literal'
      env: 'lokka',

      // Import your schema JSON here
      schemaJson: require('./schema.json'),

      // OR provide absolute path to your schema JSON
      // schemaJsonFilepath: path.resolve(__dirname, './schema.json'),

      // Optional, the name of the template tag, defaults to 'gql'
      tagName: 'gql'
    }]
  },
  plugins: [
    'graphql'
  ]
}
```

### Example config for literal graphql files

```js
// In a file called .eslintrc.js
module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      // Import default settings for your GraphQL client. Supported values:
      // 'apollo', 'relay', 'lokka', 'literal'
      env: 'literal',

      // Import your schema JSON here
      schemaJson: require('./schema.json'),

      // OR provide absolute path to your schema JSON
      // schemaJsonFilepath: path.resolve(__dirname, './schema.json'),

      // tagName is set automatically
    }]
  },
  plugins: [
    'graphql'
  ]
}
```

### Additional Schemas or Tags

This plugin can be used to validate against multiple schemas by identifying them with different tags. This is useful for applications interacting with multiple GraphQL systems. Additional schemas can simply be appended to the options list:

```js
module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      env: 'apollo',
      tagName: 'FirstGQL',
      schemaJson: require('./schema-first.json')
    }, {
      env: 'relay',
      tagName: 'SecondGQL',
      schemaJson: require('./schema-second.json')
    }]
  },
  plugins: [
    'graphql'
  ]
}
```

### Selecting Validation Rules

GraphQL validation rules can be configured in the eslint rule configuration using the `validators` option. The default selection depends on the `env` setting. If no `env` is specified, all rules are enabled by default.

The `validators` setting can be set either to a list of specific validator names or to the special value `"all"`.

```js
module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      env: 'apollo',
      validators: 'all',
      tagName: 'FirstGQL',
      schemaJson: require('./schema-first.json')
    }, {
      validators: ['FieldsOnCorrectType'],
      tagName: 'SecondGQL',
      schemaJson: require('./schema-second.json')
    }]
  },
  plugins: [
    'graphql'
  ]
}
```

The full list of available validators is:
  - `ArgumentsOfCorrectType`
  - `DefaultValuesOfCorrectType`
  - `FieldsOnCorrectType`
  - `FragmentsOnCompositeTypes`
  - `KnownArgumentNames`
  - `KnownDirectives` (*disabled by default in `relay`*)
  - `KnownFragmentNames` (*disabled by default in `apollo`, `lokka`, and `relay`*)
  - `KnownTypeNames`
  - `LoneAnonymousOperation`
  - `NoFragmentCycles`
  - `NoUndefinedVariables` (*disabled by default in `relay`*)
  - `NoUnusedFragments` (*disabled by default in `apollo`, `lokka`, and `relay`*)
  - `NoUnusedVariables`
  - `OverlappingFieldsCanBeMerged`
  - `PossibleFragmentSpreads`
  - `ProvidedNonNullArguments` (*disabled by default in `relay`*)
  - `ScalarLeafs` (*disabled by default in `relay`*)
  - `UniqueArgumentNames`
  - `UniqueFragmentNames`
  - `UniqueInputFieldNames`
  - `UniqueOperationNames`
  - `UniqueVariableNames`
  - `VariablesAreInputTypes`
  - `VariablesInAllowedPosition`

### Named Operations Validation Rule

The Named Operation rule validates that all operations are named. Naming operations is valuable for including in server-side logs and debugging.

**Pass**
```
query FetchUsername {
  viewer {
    name
  }
}
```

**Fail**
```
query {
  viewer {
    name
  }
}
```

The rule is defined as `graphql/named-operations` and requires a `schema` and optional `tagName`

```js
// In a file called .eslintrc.js
module.exports = {
  parser: "babel-eslint",
  rules: {
    "graphql/template-strings": ['error', {
      env: 'apollo',
      schemaJson: require('./schema.json'),
    }],
    "graphql/named-operations": ['warning' {
      schemaJson: require('./schema.json'),
    }],
  },
  plugins: [
    'graphql'
  ]
}
```
