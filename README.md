# eslint-plugin-graphql

GraphQL Test

## Installation

You'll first need to install [ESLint](http://eslint.org):

```
$ npm i eslint --save-dev
```

Next, install `eslint-plugin-graphql`:

```
$ npm install eslint-plugin-graphql --save-dev
```

**Note:** If you installed ESLint globally (using the `-g` flag) then you must also install `eslint-plugin-graphql` globally.

## Usage

Add `graphql` to the plugins section of your `.eslintrc` configuration file. You can omit the `eslint-plugin-` prefix:

```json
{
    "plugins": [
        "graphql"
    ]
}
```


Then configure the rules you want to use under the rules section.

```json
{
    "rules": {
        "graphql/rule-name": 2
    }
}
```

## Supported Rules

* Fill in provided rules here





