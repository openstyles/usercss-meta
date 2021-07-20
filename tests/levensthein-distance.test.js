const test = require('ava');
const {LevenshteinDistanceWithMax} = require('../lib/levensthein-distance');

test("shouldn't match", t => {
  t.is(LevenshteinDistanceWithMax('water', 'atect', 2), false);
  t.is(LevenshteinDistanceWithMax('water', 'christmas', 3), false);
  t.is(LevenshteinDistanceWithMax('water', 'water1', 0), false);
  t.is(LevenshteinDistanceWithMax('thea', 'ythee', 1), false);
  t.is(LevenshteinDistanceWithMax('12345', '567', 4), false);
});

test('should match', t => {
  t.is(LevenshteinDistanceWithMax('advanced', 'advance', 3), true);
  t.is(LevenshteinDistanceWithMax('water', 'water', 0), true);
  t.is(LevenshteinDistanceWithMax('wayer', 'water', 1), true);
  t.is(LevenshteinDistanceWithMax('thea', 'ythee', 2), true);
  t.is(LevenshteinDistanceWithMax('12345', '567', 5), true);
  t.is(LevenshteinDistanceWithMax('wayter', 'water', 1), true);
  t.is(LevenshteinDistanceWithMax('var', 'abc', 3), true);
});
