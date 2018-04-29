import {
  transformLocation,
} from './location';


function locOfAppendedString(loc, str) {
  const lines = str.split('\n');
  const numLines = lines.length;
  const lastLineCols = lines[numLines - 1].length;
  return {
    line: loc.line + numLines - 1,
    column: lastLineCols + (
      lines.length === 1
      ? loc.column
      : 0
    ),
  };
}

// Adds the value of a node to an in-progress inferred literal,
// returning the updated value, cursor, and any contributed location
// mappings.
function concatNodeValue(
  {value: inferredValue, sourceMaps, cursor},
  {node, value: nodeValue, sourceMaps: nodeSourceMaps},
) {
  const newCursor = transformLocation({
    loc: locOfAppendedString(node.loc.start, nodeValue),
    ref: node.loc.start,
    target: cursor,
  });
  return {
    value: inferredValue + nodeValue,
    sourceMaps: [
      ...sourceMaps,
      ...(nodeSourceMaps || []),
      {
        source: node.loc,
        dest: {
          start: cursor,
          end: newCursor,
        },
      },
    ],
    cursor: newCursor,
  };
}

function inferTemplateLiteralNode(node, context, state) {
  let i = 0;
  for (const s of node.quasis) {
    state = concatNodeValue(state, {node: s, value: s.value.cooked});
    const exprNode = node.expressions[i];
    if (exprNode) {
      state = inferAnyNode(exprNode, context, state);
      if (state == null) {
        return null;
      }
    }
    i += 1;
  }
  return state;
}

function inferIdentifierNode(node, context, state) {
  const scope = context.getScope();
  const ref = scope.resolve(node);
  if (ref == null || ref.resolved == null || !ref.isStatic()) {
    return null;
  }
  const defs = ref.resolved.defs.filter(d => d.node.init != null);
  if (defs.length !== 1) {
    return null;
  }
  const init = defs[0].node.init;
  return inferAnyNode(init, context, state);
}

function inferLiteralNode(node, _context, state) {
  if (typeof node.value === 'string') {
    return concatNodeValue(
      state,
      {node, value: node.value},
    );
  } else {
    return null;
  }
}

function inferAnyNode(node, context, state) {
  if (node.type === 'Literal') {
    return inferLiteralNode(node, context, state);
  } else if (node.type === 'Identifier') {
    return inferIdentifierNode(node, context, state);
  } else if (node.type === 'TemplateLiteral') {
    return inferTemplateLiteralNode(node, context, state);
  } else {
    return null;
  }
}

export default function infer(node, context) {
  const initialState = {
    value: '',
    cursor: {line: 1, column: 1},
    sourceMaps: [],
  };
  return inferAnyNode(node, context, initialState);
}
