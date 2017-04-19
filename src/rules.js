import { GraphQLError } from 'graphql';

export function OperationsMustHaveNames(context) {
  return {
    OperationDefinition(node) {
      if (!node.name) {
        context.reportError(
          new GraphQLError("All operations must be named", [ node ])
        );
      }
    },
  };
}

export function RequiredFields(context, options) {
  return {
    Field(node) {
      const def = context.getFieldDef();
      const { requiredFields } = options;
      requiredFields.forEach(field => {
        console.log('def', def);
        if (def.type && def.type._fields && def.type._fields[field]) {

          const fieldWasRequested = !!node.selectionSet.selections.find(
            n => (n.name.value === field || n.kind === 'FragmentSpread')
          );
          if (!fieldWasRequested) {
            context.reportError(
              new GraphQLError(`'${field}' field required on '${node.name.value}'`, [node])
            );
          }
        }
      });
    },
  };
}
