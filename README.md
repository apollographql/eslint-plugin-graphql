# eslint-plugin-graphql

An ESLint plugin that checks tagged template strings against a GraphQL schema.

```
npm install eslint-plugin-graphql
```

![Screenshot from Atom](screenshot.png)

**Coming soon:** You can use it now with the manual approach described below, but we are working on easier tooling so you can just pass a GraphQL server URL.

### Configuring ESLint

You'll need to import your [introspection query result](https://github.com/graphql/graphql-js/blob/master/src/utilities/introspectionQuery.js). This can be done if you define your ESLint config in a JS file:

```js
// In a file called .eslintrc.js
module.exports = {
  "parser": "babel-eslint",
  "rules": {
    "graphql/template-strings": ['error', {
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
