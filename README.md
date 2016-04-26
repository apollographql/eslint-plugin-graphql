# eslint-plugin-graphql

An ESLint plugin that checks tagged template strings against a GraphQL schema.

```
npm install eslint-plugin-graphql
```

![Screenshot from Atom](screenshot.png)

Supports three GraphQL clients out of the box:

1. [Apollo client](http://docs.apollostack.com/apollo-client/index.html)
2. [Relay](https://facebook.github.io/relay/)
3. [Lokka](https://github.com/kadirahq/lokka)

**Coming soon:** You can use it now with the manual approach described below, but we are working on easier tooling so you can just pass a GraphQL server URL.

### Importing schema JSON

You'll need to import your [introspection query result](https://github.com/graphql/graphql-js/blob/master/src/utilities/introspectionQuery.js). This can be done if you define your ESLint config in a JS file.

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

      // Optional, the name of the template tag, defaults to 'gql' for
      tagName: 'gql'
    }]
  },
  plugins: [
    'graphql'
  ]
}
```
