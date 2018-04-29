export function getSourceLocationFromDocLocation(sourceNodeStart, docLocation, sourceMaps) {
  // Start off with a "best guess" of the location.
  let bestLoc = transformLocation({
    loc: docLocation,
    ref: docLocation,
    target: sourceNodeStart,
  });

  // "dest" refers to the GraphQL document text and "source" is the source code.
  for (const {source, dest} of sourceMaps) {
    if (isLocationInSpan(dest, docLocation)) {
      bestLoc = transformLocation({
        loc: docLocation,
        ref: dest.start,
        target: source.start,
      });
    }
  }

  return bestLoc;
}

export function isLocationInSpan(haystack, needle) {
  return (
    needle.line >= haystack.start.line
    && needle.line <= haystack.end.line
    && (needle.line !== haystack.start.line || needle.column >= haystack.start.column)
    && (needle.line !== haystack.end.line || needle.column < haystack.end.column)
  );
}

// Transform location 'loc' from the reference space 'ref' mapping to 'target'
export function transformLocation({loc, ref, target}) {
  return {
    line: target.line + (loc.line - ref.line),
    column: (
      loc.line === ref.line
      ? target.column + (loc.column - ref.column)
      : loc.column
    ),
  };
}
