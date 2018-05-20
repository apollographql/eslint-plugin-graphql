import { GraphQLError, getNamedType } from 'graphql';

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

function getFieldWasRequestedOnNode(node, field, recursing = false) {
  return node.selectionSet.selections.some(n => {
    // If it's an inline fragment, we need to look deeper
    if (n.kind === 'InlineFragment' && !recursing) {
      return getFieldWasRequestedOnNode(n, field, true);
    }
    if (n.kind === 'FragmentSpread') {
      // We don't know if the field was requested in this case, so default to not erroring.
      return true;
    }
    return n.name.value === field;
  });
}

export function RequiredFields(context, options) {
  return {
    Field(node) {
      const def = context.getFieldDef();
      if (!def) {
        return;
      }
      const { requiredFields } = options;
      requiredFields.forEach(field => {
        const fieldAvaliableOnType = def.type && def.type._fields && def.type._fields[field];

        function recursivelyCheckOnType(ofType, field) {
          return (ofType._fields && ofType._fields[field]) || (ofType.ofType && recursivelyCheckOnType(ofType.ofType, field));
        }

        let fieldAvaliableOnOfType = false;
        if (def.type && def.type.ofType) {
          fieldAvaliableOnOfType = recursivelyCheckOnType(def.type.ofType, field);
        }
        if (fieldAvaliableOnType || fieldAvaliableOnOfType) {
          const fieldWasRequested = getFieldWasRequestedOnNode(node, field);
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

export function typeNamesShouldBeCapitalized(context) {
  return {
    NamedType(node) {
      const typeName = node.name.value;
      if (typeName[0] == typeName[0].toLowerCase()) {
        context.reportError(
          new GraphQLError("All type names should start with a capital letter", [ node ])
        );
      }
    }
  }
}

// Mostly taken from https://github.com/graphql/graphql-js/blob/063148de039b02670a760b8d3dfaf2a04a467169/src/utilities/findDeprecatedUsages.js
// See explanation in [#93](https://github.com/apollographql/eslint-plugin-graphql/pull/93)
export function noDeprecatedFields(context) {
  return {
    Field(node) {
      const fieldDef = context.getFieldDef();
      if (fieldDef && fieldDef.isDeprecated) {
        const parentType = context.getParentType();
        if (parentType) {
          const reason = fieldDef.deprecationReason;
          context.reportError(new GraphQLError(
            `The field ${parentType.name}.${fieldDef.name} is deprecated.` +
            (reason ? ' ' + reason : ''),
            [ node ]
          ));
        }
      }
    },
    EnumValue(node) {
      // context is of type ValidationContext which doesn't export getEnumValue.
      // Bypass the public API to grab that information directly from _typeInfo.
      const enumVal = context._typeInfo.getEnumValue();
      if (enumVal && enumVal.isDeprecated) {
        const type = getNamedType(context.getInputType());
        if (type) {
          const reason = enumVal.deprecationReason;
          context.reportError(new GraphQLError(
            `The enum value ${type.name}.${enumVal.name} is deprecated.` +
            (reason ? ' ' + reason : ''),
            [ node ]
          ));
        }
      }
    }
  }
}
