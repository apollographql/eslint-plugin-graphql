import schemaJson from '../schema.json';

import {
  rule,
  ruleTester,
} from '../helpers';

const options = [
  {
    schemaJson,
    env: 'relay',
  },
];

// Need this to support statics
const parser = require.resolve('babel-eslint');

ruleTester.run('relay', rule, {
  valid: [
    `
      @relay({
        fragments: {
          greetings: () => Relay.QL\`
            fragment on Greetings {
              hello,
              hi,
            }
          \`,
        }
      })
      class HelloApp extends React.Component {}
    `,
    `
      const StyledComponent = css\`height: 12px;\`
    `,
    `
      HelloApp = Relay.createContainer(HelloApp, {
        fragments: {
          greetings: () => Relay.QL\`
            fragment on Greetings {
              hello,
            }
          \`,
        }
      });
    `,
    `
      class HelloRoute extends Relay.Route {
        static routeName = 'Hello';  // A unique name
        static queries = {
          greetings: (Component) => Relay.QL\`
            query GreetingsQuery {
              greetings {
                \${Component.getFragment('greetings')},
              },
            }
          \`,
        };
      }
    `,
    `
      class CreateCommentMutation extends Relay.Mutation {
        static fragments = {
          story: () => Relay.QL\`
            fragment on Story { id }
          \`,
        };
        getMutation() {
          return Relay.QL\`
            mutation { createComment }
          \`;
        }
        getFatQuery() {
          return Relay.QL\`
            fragment on CreateCommentPayload {
              story { comments },
            }
          \`;
        }
        getConfigs() {
          return [{
            type: 'FIELDS_CHANGE',
            fieldIDs: { story: this.props.story.id },
          }];
        }
        getVariables() {
          return { text: this.props.text };
        }
      }
    `,
    `
      Relay.QL\`fragment on CreateEventPayload @relay(pattern: true) {
        viewer {
          events
        }
        user {
          events
        }
      }\`
    `,
    `
      Relay.QL\`
        query StoresListQuery(
          $count: Int
          $cursor: String
          $search: String
        ) {
          ...StoresList_stores
        }
      \`
    `
  ].map((code) => ({ options, parser, code })),

  invalid: [
    {
      options,
      parser,
      code: `
        @relay({
          fragments: {
            greetings: () => Relay.QL\`
              fragment on Greetings {
                hellox,
              }
            \`,
          }
        })
        class HelloApp extends React.Component {}
      `,
      errors: [{
        message: 'Cannot query field "hellox" on type "Greetings". Did you mean "hello"?',
        type: 'TaggedTemplateExpression',
        line: 6,
        column: 17
      }]
    },
    // Example from issue report:
    // https://github.com/apollostack/eslint-plugin-graphql/issues/12#issuecomment-215445880
    {
      options,
      parser,
      code: `
        import React, { Component, View } from 'react-native';
        import Relay from 'react-relay';

        @relay({
          fragments: {
            user: () => Relay.QL\`
              fragment on PublicUser {
                fullName
                nonExistentField
              }
            \`
          }
        })
        class Example extends Component {
          render() {
            return <View/>;
          }
        }

        class AnotherExample extends Component {
          render() {
            return <View/>;
          }
        }

        Relay.createContainer(
          AnotherExample,
          {
            fragments: {
              user: () => Relay.QL\`
                fragment on PublicUser {
                  fullName
                  nonExistentField
                }
              \`
            }
          }
        );
      `,
      errors: [
        {
          message: 'Cannot query field "nonExistentField" on type "PublicUser".',
          line: 10,
          column: 17,
        },
        {
          message: 'Cannot query field "nonExistentField" on type "PublicUser".',
          line: 34,
          column: 19,
        },
      ],
    },
  ],
});
