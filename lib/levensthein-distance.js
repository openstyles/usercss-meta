/**
 * Gives you a array with filled with 1 to amount.
 * @param {number} amount
 * @returns {number[]}
 */
function range(amount) {
  const range = Array.from({length: amount});
  for (let i = 0; i < amount; i++) {
    range[i] = i + 1;
  }

  return range;
}

/**
 * Check if the amount of edits between firstString and secondString is <= maxEdits.
 * It uses the Levenshtein distance algorithm with the two matrix rows variant.
 * @param {string} firstString First string to be checked against the other string
 * @param {string} secondString Second string to be checked against the other string
 * @param {number} maxEdit The maximum amount of edits that these 2 string should have.
 * @returns {boolean} indicate if the 2 strings's edits are less or equal to maxEdits
 */
function LevenshteinDistanceWithMax(firstString, secondString, maxEdit) {
  const lenOne = firstString.length;
  const lenTwo = secondString.length;

  const lenDiff = Math.abs(lenOne - lenTwo);
  // Are the difference between 2 lengths greater than
  // maxEdit, we know to bail out early on.
  if (lenDiff > maxEdit) {
    return false;
  }

  // If the difference between the 2 strings is exactly maxEdit,
  // We only have to check if the 2 strings are equal without the lenDiff.
  if (lenDiff === maxEdit) {
    if (lenOne > lenTwo) {
      return firstString.substring(0, lenTwo) === secondString;
    }
    return firstString === secondString.substring(0, lenOne);
  }

  const distance = range(lenOne);
  let prevDistanceCost;
  let editCost;
  for (let i = 1; i <= lenTwo; i++) {
    // Calculate the current row distances from the previous row.
    distance[0] = i;
    prevDistanceCost = i - 1;
    let currentCostForRow = maxEdit + 1;
    for (let j = 1; j <= lenOne; j++) {
      let minimumCost = distance[j] + 1;
      if ((distance[j - 1] + 1) < minimumCost) {
        minimumCost = distance[j - 1] + 1;
      }

      editCost = firstString[j - 1] === secondString[i - 1] ? 0 : 1;
      if ((prevDistanceCost + editCost) < minimumCost) {
        minimumCost = prevDistanceCost + editCost;
      }

      if (minimumCost < currentCostForRow) {
        currentCostForRow = minimumCost;
      }

      prevDistanceCost = distance[j];
      distance[j] = minimumCost;
    }

    // Check after each row if maxEdit is less than miniumCostRow
    // to know when to stop early on.
    if (currentCostForRow > maxEdit) {
      return false;
    }
  }

  return true;
}

module.exports = {
  LevenshteinDistanceWithMax
};
