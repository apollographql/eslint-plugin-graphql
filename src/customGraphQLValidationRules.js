import { GraphQLError, getNamedType } from "graphql";

export function OperationsMustHaveNames(context) {
  return {
    OperationDefinition(node) {
      if (!node.name) {
        context.reportError(
          new GraphQLError("All operations must be named", [node])
        );
      }
    }
  };
}

function getFieldWasRequestedOnNode(node, field) {
  return node.selectionSet.selections.some(n => {
    return n.kind === "Field" && n.name.value === field;
  });
}

function fieldAvailableOnType(type, field) {
  if (!type) {
    return false;
  }

  return (
    (type._fields && type._fields[field]) ||
    (type.ofType && fieldAvailableOnType(type.ofType, field))
  );
}

export function RequiredFields(context, options) {
  const { requiredFields } = options;

  return {
    FragmentDefinition(node) {
      requiredFields.forEach(field => {
        const type = context.getType();

        if (fieldAvailableOnType(type, field)) {
          const fieldWasRequested = getFieldWasRequestedOnNode(node, field);
          if (!fieldWasRequested) {
            context.reportError(
              new GraphQLError(
                `'${field}' field required on 'fragment ${node.name.value} on ${
                  node.typeCondition.name.value
                }'`,
                [node]
              )
            );
          }
        }
      });
    },

    // Every inline fragment must have the required field specified inside
    // itself or in some parent selection set.
    InlineFragment(node, key, parent, path, ancestors) {
      requiredFields.forEach(field => {
        const type = context.getType();

        if (fieldAvailableOnType(type, field)) {
          // First, check the selection set on this inline fragment
          if (node.selectionSet && getFieldWasRequestedOnNode(node, field)) {
            return true;
          }

          const ancestorClone = [...ancestors];

          let nearestField;
          let nextAncestor;

          // Now, walk up the ancestors, until you see a field.
          while (!nearestField) {
            nextAncestor = ancestorClone.pop();

            if (
              nextAncestor.selectionSet &&
              getFieldWasRequestedOnNode(nextAncestor, field)
            ) {
              return true;
            }

            if (nextAncestor.kind === "Field") {
              nearestField = nextAncestor;
            }
          }

          // If we never found a field, the query is malformed
          if (!nearestField) {
            throw new Error(
              "Inline fragment found inside document without a parent field."
            );
          }

          // We found a field, but we never saw the field we were looking for in
          // the intermediate selection sets.
          context.reportError(
            new GraphQLError(
              `'${field}' field required on '... on ${
                node.typeCondition.name.value
              }'`,
              [node]
            )
          );
        }
      });
    },

    // Every field that can have the field directly on it, should. It's not
    // enough to have some child fragment to include the field, since we don't
    // know if that fragment covers all of the possible type options.
    Field(node) {
      const def = context.getFieldDef();
      if (!def) {
        return;
      }

      requiredFields.forEach(field => {
        if (fieldAvailableOnType(def.type, field)) {
          const fieldWasRequested = getFieldWasRequestedOnNode(node, field);
          if (!fieldWasRequested) {
            context.reportError(
              new GraphQLError(
                `'${field}' field required on '${node.name.value}'`,
                [node]
              )
            );
          }
        }
      });
    }
  };
}

export function typeNamesShouldBeCapitalized(context) {
  return {
    NamedType(node) {
      const typeName = node.name.value;
      if (typeName[0] == typeName[0].toLowerCase()) {
        context.reportError(
          new GraphQLError(
            "All type names should start with a capital letter",
            [node]
          )
        );
      }
    }
  };
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
          context.reportError(
            new GraphQLError(
              `The field ${parentType.name}.${fieldDef.name} is deprecated.` +
                (reason ? " " + reason : ""),
              [node]
            )
          );
        }
      }
    },
    EnumValue(node) {
      // context is of type ValidationContext which doesn't export getEnumValue.
      // Bypass the public API to grab that information directly from _typeInfo.
      const enumVal = context._typeInfo.getEnumValue();
      if (enumVal && enumVal.isDeprecated) {
        const type = getNamedType(context.getInputType());
        if (!type) {
          return;
        }

        const reason = enumVal.deprecationReason;
        context.reportError(
          new GraphQLError(
            `The enum value ${type.name}.${enumVal.name} is deprecated.` +
              (reason ? " " + reason : ""),
            [node]
          )
        );
      }
    }
  };
}
