import { rules } from '../src';
import { RuleTester } from 'eslint';
import schemaJson from './schema.json';
import path from 'path';
import graphql, { printSchema, buildClientSchema, specifiedRules as allGraphQLValidators } from 'graphql';

export const isGraphQL15 = graphql.versionInfo && graphql.versionInfo.major >= 15;

export const schemaJsonFilepath = path.resolve(__dirname, './schema.json');
export const secondSchemaJsonFilepath = path.resolve(__dirname, './second-schema.json');
export const schemaString = printSchema(buildClientSchema(schemaJson.data))

const allGraphQLValidatorNames = allGraphQLValidators.map(rule => rule.name);

let requiredArgumentRule = 'ProvidedNonNullArguments';
if (allGraphQLValidatorNames.includes('ProvidedRequiredArgumentsRule')) {
  requiredArgumentRule = 'ProvidedRequiredArgumentsRule';
} else if (allGraphQLValidatorNames.includes('ProvidedRequiredArguments')) {
  requiredArgumentRule = 'ProvidedRequiredArguments';
}

export const requiredArgumentRuleName = requiredArgumentRule;

// Init rule

export const rule = rules['template-strings'];

// Set up tests

export const ruleTester = new RuleTester();

export const parserOptions = {
  'ecmaVersion': 6,
  'sourceType': 'module',
};
