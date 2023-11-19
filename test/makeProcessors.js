import assert from "assert";
import { ESLint } from "eslint";
import path from "path";

import schemaJson from "./schema.json";
import plugin, { processors } from "../src";

async function execute(file) {
  const eslint = new ESLint({
    extensions: [".gql", ".graphql"],
    plugins: {
      "eslint-plugin-graphql": plugin,
    },
    baseConfig: {
      plugins: ["graphql"],
      rules: {
        "graphql/required-fields": [
          "error",
          {
            schemaJson,
            env: "literal",
            requiredFields: ["id"],
          },
        ],
      },
    },
    ignore: false,
    useEslintrc: false,
    overrideConfig: {
      parserOptions: {
        ecmaVersion: 6,
        sourceType: "module",
      },
    },
  });

  const results = await eslint.lintFiles([
    path.join(__dirname, "__fixtures__", `${file}.graphql`),
  ]);

  return results[0];
}

describe("processors", () => {
  it("should define processors", () => {
    const extensions = Object.keys(processors);

    assert(extensions.includes(".gql"));
    assert(extensions.includes(".graphql"));
  });

  it("should wrap with backticks, escape properly and prepend internalTag", () => {
    const query = 'query { search(q: "` \\n ${}") { title } }';
    const expected =
      'ESLintPluginGraphQLFile`query { search(q: "\\` \\\\n \\${}") { title } }`';
    const preprocess = processors[".gql"].preprocess;
    const result = preprocess(query);

    assert.equal(result, expected);
  });

  it("should filter only graphql/* rules ", () => {
    const messages = [
      { ruleId: "no-undef" },
      { ruleId: "semi" },
      { ruleId: "graphql/randomString" },
      { ruleId: "graphql/template-strings" },
    ];
    const expected = { ruleId: "graphql/template-strings" };
    const postprocess = processors[".gql"].postprocess;
    const result = postprocess(messages);

    assert.equal(result.length, 1);
    assert.equal(result[0].ruleId, expected.ruleId);
  });

  describe("graphql/required-fields", () => {
    describe("valid", () => {
      [
        "required-fields-valid-no-id",
        "required-fields-valid-id",
        "required-fields-valid-array",
      ].forEach((filename) => {
        it(`does not warn on file ${filename}`, async () => {
          const results = await execute(filename);
          console.warn(results);
          assert.equal(results.errorCount, 0);
        });
      });
    });

    describe("invalid", () => {
      [
        "required-fields-invalid-no-id",
        "required-fields-invalid-array",
      ].forEach((filename) => {
        it(`warns on file ${filename}`, async () => {
          const results = await execute(filename);
          assert.equal(results.errorCount, 1);
          const message = results.messages[0].message;
          assert.ok(new RegExp("'id' field required").test(message));
        });
      });
    });

    describe("error line/column locations", () => {
      it("populates correctly for a single-line document", async () => {
        const results = await execute("required-fields-invalid-array");
        assert.equal(results.errorCount, 1);
        assert.deepEqual(results.messages[0], {
          column: 9,
          line: 1,
          message: "'id' field required on 'stories'",
          nodeType: "TaggedTemplateExpression",
          ruleId: "graphql/required-fields",
          severity: 2,
        });
      });

      it("populates correctly for a multi-line document", async () => {
        const results = await execute("required-fields-invalid-no-id");
        assert.equal(results.errorCount, 1);
        assert.deepEqual(results.messages[0], {
          column: 3,
          line: 2,
          message: "'id' field required on 'greetings'",
          nodeType: "TaggedTemplateExpression",
          ruleId: "graphql/required-fields",
          severity: 2,
        });
      });
    });
  });
});
