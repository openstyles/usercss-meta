import test from 'ava';
import {util} from '..';

test('parseChar error', t => {
  const error = t.throws(() => util.parseChar({
    text: '',
    lastIndex: 0
  }));
  t.is(error.index, 0);
  t.is(error.code, 'EOF');
});

test('parseWord error', t => {
  const error = t.throws(() => util.parseWord({
    text: 'something *',
    lastIndex: 10
  }));
  t.is(error.index, 10);
  t.is(error.message, 'Invalid word');
});

test('parseJSON error', t => {
  const error = t.throws(() => util.parseJSON({
    text: 'something [abc]',
    lastIndex: 10
  }));
  t.is(error.index, 11);
  t.is(error.message, "Invalid JSON: Unknown literal 'abc'");
});

test('parseJSON object error', t => {
  const error = t.throws(() => util.parseJSON({
    text: '{"a", "b"}',
    lastIndex: 0
  }));
  t.is(error.index, 4);
  t.is(error.message, "Invalid JSON: Missing character: ':'");
});

test('parseJSON object error 2', t => {
  const error = t.throws(() => util.parseJSON({
    text: '{"a": "b" "c"}',
    lastIndex: 0
  }));
  t.is(error.index, 10);
  t.is(error.message, "Invalid JSON: Missing character: ',', '}'");
});

test('parseJSON array error', t => {
  const error = t.throws(() => util.parseJSON({
    text: '["a" "b"]',
    lastIndex: 0
  }));
  t.is(error.index, 5);
  t.is(error.message, "Invalid JSON: Missing character: ',', ']'");
});

test('parseJSON multiline string', t => {
  const state = {
    text: '`a\nb`',
    lastIndex: 0
  };
  util.parseJSON(state);
  t.is(state.index, 0);
  t.is(state.lastIndex, 5);
  t.is(state.value, 'a\nb');
});

test('parseJSON number', t => {
  const state = {
    text: '123',
    lastIndex: 0
  };
  util.parseJSON(state);
  t.is(state.index, 0);
  t.is(state.lastIndex, 3);
  t.is(state.value, 123);
});

test('parseJSON prime', t => {
  const state = {
    text: '[true, false, null]',
    lastIndex: 0
  };
  util.parseJSON(state);
  t.is(state.index, 0);
  t.is(state.lastIndex, 19);
  t.deepEqual(state.value, [true, false, null]);
});

test('parseEOT error', t => {
  const error = t.throws(() => util.parseEOT({
    text: 'something <<<EOT',
    lastIndex: 10
  }));
  t.is(error.index, 10);
  t.is(error.message, 'Missing EOT');
});

test('parseString backtick', t => {
  const state = {
    text: 'something `a\nb`',
    lastIndex: 10
  };
  util.parseString(state);
  t.is(state.value, 'a\nb');
});

test('parseString escape chars', t => {
  const state = {
    text: '"a\\"b\\nc"',
    lastIndex: 0
  };
  util.parseString(state);
  t.is(state.lastIndex, 9);
  t.is(state.value, 'a"b\nc');
});

test('parseString error', t => {
  const state = {
    text: 'something ~abc~',
    lastIndex: 10
  };
  const error = t.throws(() => util.parseString(state));
  t.is(error.index, 10);
  t.is(error.message, 'Invalid string');
});

test('parseNumber error', t => {
  const state = {
    text: 'o123',
    lastIndex: 0
  };
  const error = t.throws(() => util.parseNumber(state));
  t.is(error.index, 0);
  t.is(error.message, 'Invalid number');
});
