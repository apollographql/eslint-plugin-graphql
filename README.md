# eslint-plugin-graphql

[![npm version](https://badge.fury.io/js/eslint-plugin-graphql.svg)](https://badge.fury.io/js/eslint-plugin-graphql)
[![Build Status](https://travis-ci.org/apollostack/eslint-plugin-graphql.svg?branch=master)](https://travis-ci.org/apollostack/eslint-plugin-graphql)
[![Get on Slack](http://slack.apollostack.com/badge.svg)](http://slack.apollostack.com/)

An ESLint plugin that checks tagged template strings against a GraphQL schema.

```
npm install eslint-plugin-graphql
```

![Screenshot from Atom](https://github.com/apollostack/eslint-plugin-graphql/raw/master/screenshot.png)

Supports three GraphQL clients out of the box:

1. [Apollo client](http://docs.apollostack.com/apollo-client/index.html)
2. [Relay](https://facebook.github.io/relay/)
3. [Lokka](https://github.com/kadirahq/lokka)

**Coming soon:** You can use it now with the manual approach described below, but we are working on easier tooling so you can just pass a GraphQL server URL.

### Importing schema JSON

You'll need to import your [introspection query result](https://github.com/graphql/graphql-js/blob/master/src/utilities/introspectionQuery.js). This can be done if you define your ESLint config in a JS file.

### Identity template literal tag

This plugin relies on GraphQL queries being prefixed with a special tag. In Relay, this is always done, but other clients like just take normal template literals without a tag. In this case, define an identity tag that doesn't do anything except for tell the linter this is a GraphQL query:

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

Note: the linter rule could be extended to identify calls to various specific APIs to eliminate the need for a template literal tag, but this might just make the implementation a lot more complex for little benefit.

### Example config for Apollo

```js
// In a file called .eslintrc.js
module.exports = {
  "parser": "babel-eslint",
  "rules": {
    "graphql/template-strings": ['error', {
      // Import default settings for your GraphQL client. Supported values:
      // 'apollo', 'relay', 'lokka'
      env: 'apollo',

      // Import your schema JSON here
      schemaJson: require('./schema.json'),

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
  "parser": "babel-eslint",
  "rules": {
    "graphql/template-strings": ['error', {
      // Import default settings for your GraphQL client. Supported values:
      // 'apollo', 'relay', 'lokka'
      env: 'relay',

      // Import your schema JSON here
      schemaJson: require('./schema.json'),

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
  "parser": "babel-eslint",
  "rules": {
    "graphql/template-strings": ['error', {
      // Import default settings for your GraphQL client. Supported values:
      // 'apollo', 'relay', 'lokka'
      env: 'lokka',

      // Import your schema JSON here
      schemaJson: require('./schema.json'),

      // Optional, the name of the template tag, defaults to 'gql'
      tagName: 'gql'
    }]
  },
  plugins: [
    'graphql'
  ]
}
```
