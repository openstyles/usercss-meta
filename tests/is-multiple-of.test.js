/* eslint no-loss-of-precision: 0, unicorn/numeric-separators-style: 0 */

const test = require('ava');
const {isMultipleOf} = require('../lib/parse');

test('isMultipleOf', t => {
  t.truthy(isMultipleOf(0.3, 0.1));
  t.truthy(isMultipleOf(0.07, 0.01));
  t.truthy(isMultipleOf(0.777777777777777777, 0.111111111111111111)); // exceeds 15-digit precision limit
  t.truthy(isMultipleOf(12345678901234567890, 2)); // exceeds 15-digit precision limit
  t.falsy(isMultipleOf(7, 0.3));
});
