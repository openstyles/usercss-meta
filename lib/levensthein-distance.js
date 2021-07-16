/**
 * Gives you a array with filled with 1 to amount.
 * @param {number} amount
 * @returns {number[]}
 */
function range(amount) {
  const range = Array.from({amount});
  range[0] = 1;
  for (let i = 1; range[i - 1] < amount; i++) range[i] = i + 1;
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

  const distance = range(lenOne);
  let lastdiag;
  let olddiag;
  let editCost;
  for (let i = 1; i <= lenTwo; i++) {
    distance[0] = i;
    lastdiag = i - 1;
    let miniumRows = maxEdit + 1;
    for (let j = 1; j <= lenOne; j++) {
      olddiag = distance[j];
      let min = distance[j] + 1;
      if ((distance[j - 1] + 1) < min) {
        min = distance[j - 1] + 1;
      }

      editCost = firstString[j - 1] === secondString[i - 1] ? 0 : 1;
      if ((lastdiag + editCost) < min) {
        min = lastdiag + editCost;
      }

      if (min < miniumRows) {
        miniumRows = min;
      }

      distance[j] = min;
      lastdiag = olddiag;
    }

    // Check after each row if maxEdits is less than miniumRows
    // to know when to stop early on.
    if (miniumRows > maxEdit) {
      return false;
    }
  }

  return true;
}

module.exports = {
  LevenshteinDistanceWithMax
};
