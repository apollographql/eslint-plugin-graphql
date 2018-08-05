// The removeDirectivesFromDocument function in apollo-utilities currently causes "Max callstack" errors
// Due to deep cloning the document before working on it
// Thus this file is replicating a lot of logic to do the same thing without errors.

import {getOperationDefinitionOrDie, createFragmentMap, getFragmentDefinitions} from 'apollo-utilities'

function isNotEmpty(
  op,
  fragments,
) {
  // keep selections that are still valid
  return (
    op.selectionSet.selections.filter(
      selectionSet =>
        // anything that doesn't match the compound filter is okay
        !// not an empty array
        (
          selectionSet &&
          // look into fragments to verify they should stay
          selectionSet.kind === 'FragmentSpread' &&
          // see if the fragment in the map is valid (recursively)
          !isNotEmpty(fragments[selectionSet.name.value], fragments)
        ),
    ).length > 0
  );
}

function getDirectiveMatcher(
  directives,
) {
  return function directiveMatcher(directive) {
    return directives.some(
      (dir) => {
        if (dir.name && dir.name === directive.name.value) return true;
        if (dir.test && dir.test(directive)) return true;
        return false;
      },
    );
  };
}

function removeDirectivesFromSelectionSet(
  directives,
  selectionSet,
) {
  if (!selectionSet.selections) return selectionSet;
  // if any of the directives are set to remove this selectionSet, remove it
  const agressiveRemove = directives.some(
    dir => dir.remove,
  );

  selectionSet.selections = selectionSet.selections
    .map(selection => {
      if (
        selection.kind !== 'Field' ||
        !(selection ) ||
        !selection.directives
      )
        return selection;
      const directiveMatcher = getDirectiveMatcher(directives);
      let remove;
      selection.directives = selection.directives.filter(directive => {
        const shouldKeep = !directiveMatcher(directive);

        if (!remove && !shouldKeep && agressiveRemove) remove = true;

        return shouldKeep;
      });

      return remove ? null : selection;
    })
    .filter(x => !!x);

  selectionSet.selections.forEach(selection => {
    if (
      (selection.kind === 'Field' || selection.kind === 'InlineFragment') &&
      selection.selectionSet
    ) {
      removeDirectivesFromSelectionSet(directives, selection.selectionSet);
    }
  });

  return selectionSet;
}


export default (
  directives,
  doc,
) => {
  doc.definitions.forEach((definition) => {
    removeDirectivesFromSelectionSet(
      directives,
      (definition).selectionSet,
    );
  });
  const operation = getOperationDefinitionOrDie(doc);
  const fragments = createFragmentMap(getFragmentDefinitions(doc));
  return isNotEmpty(operation, fragments) ? doc : null;
}