/* eslint dot-notation: 0 */

const test = require('ava');

const {createParser, parse, util, ParseError} = require('..');
const {drawRange, extractRange} = require('./util');

const looseParser = createParser({mandatoryKeys: []});

test('missing mandatory', t => {
  const err = t.throws(() => {
    parse(`
      /* ==UserStyle==
      @name foo
      ==/UserStyle== */
    `);
  });
  t.is(err.code, 'missingMandatory');
  t.deepEqual(err.args, ['namespace', 'version']);
});

test('missing mandatory value', t => {
  const err = t.throws(() => {
    parse(`
      /* ==UserStyle==
      @name ""
      @namespace bar
      @version 0.1.0
      ==/UserStyle== */
    `);
  });
  t.is(err.code, 'missingMandatory');
  t.deepEqual(err.args, ['name']);
});

test('missing mandatory (missing value)', t => {
  const err = t.throws(() => {
    parse(`
      /* ==UserStyle==
      @name foo
      @namespace
      @version 0.1.0
      ==/UserStyle== */
    `);
  });
  t.is(err.code, 'missingValue');
});

test('unknown var type', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @var |unknown my-var "My variable" 123456
    ==/UserStyle== */
  `);
  const error = t.throws(() => looseParser.parse(text));
  t.is(error.message, 'Unknown @var type: unknown');
  t.is(drawRange(text, error.index), raw);
});

test('invalid characters', t => {
  const meta = '\r';
  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.message, "metadata includes invalid character: '\\r'");
});

test('unknownKey ignore', t => {
  const meta = `
    /* ==UserStyle==
    @myKey 123456
    ==/UserStyle== */
  `;

  const {metadata} = parse(meta, {unknownKey: 'ignore', mandatoryKeys: []});
  t.is(metadata.myKey, undefined);
});

test('unknownKey assign', t => {
  const meta = `
    /* ==UserStyle==
    @myKey 123 456
    ==/UserStyle== */
  `;

  const {metadata} = parse(meta, {unknownKey: 'assign', mandatoryKeys: []});
  t.is(metadata.myKey, '123 456');
});

test('unknownKey throw', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    |@myKey 123 456
    ==/UserStyle== */
  `);

  const error = t.throws(() => {
    parse(text, {unknownKey: 'throw', mandatoryKeys: []});
  });
  t.is(error.message, 'Unknown metadata: @myKey');
  t.is(drawRange(text, error.index), raw);
});

test('unknownKey throw with hyphen', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    |@my-key 123 456
    ==/UserStyle== */
  `);

  const error = t.throws(() => {
    parse(text, {unknownKey: 'throw', mandatoryKeys: []});
  });
  t.is(error.message, 'Unknown metadata: @my-key');
  t.is(drawRange(text, error.index), raw);
});

test('unknownKey invalid', t => {
  const meta = `
    /* ==UserStyle==
    @myKey 123 456
    ==/UserStyle== */
  `;

  const error = t.throws(() => {
    parse(meta, {unknownKey: 'invalid', mandatoryKeys: []});
  });
  t.is(error.message, "unknownKey must be 'ignore', 'assign', or 'throw'");
});

test('basic URLs', t => {
  const meta = `
    /* ==UserStyle==
    @homepageURL https://github.com/StylishThemes/parse-usercss
    ==/UserStyle== */
  `;

  const {metadata} = looseParser.parse(meta);
  t.is(metadata.homepageURL, 'https://github.com/StylishThemes/parse-usercss');
});

test('basic URLs error', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @homepageURL |../homepage.php
    ==/UserStyle== */
  `);

  const error = t.throws(() => looseParser.parse(text));
  t.is(error.code, 'ERR_INVALID_URL');
  t.is(drawRange(text, error.index), raw);
});

test('basic URLs protocol error', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @homepageURL |file:///C:/windows
    ==/UserStyle== */
  `);

  const error = t.throws(() => looseParser.parse(text));
  t.is(error.message, 'Invalid protocol: file:');
  t.is(drawRange(text, error.index), raw);
});

test('parseKey', t => {
  const parser = createParser({
    mandatoryKeys: [],
    parseKey: {
      myKey: state => {
        util.parseStringToEnd(state);
        state.value += ' OK';
      }
    }
  });
  const meta = `
    /* ==UserStyle==
    @myKey Hello
    ==/UserStyle== */
  `;

  t.is(parser.parse(meta).metadata.myKey, 'Hello OK');
});

test('parseVar', t => {
  const parser = createParser({
    mandatoryKeys: [],
    parseVar: {
      color: state => {
        util.parseStringToEnd(state);
        state.value += ' OK';
      }
    }
  });
  const meta = `
    /* ==UserStyle==
    @var color my-color "My color" #fff
    ==/UserStyle== */
  `;

  const va = parser.parse(meta).metadata.vars['my-color'];
  t.is(va.type, 'color');
  t.is(va.label, 'My color');
  t.is(va.default, '#fff OK');
});

test('validateKey', t => {
  const parser = createParser({
    mandatoryKeys: [],
    validateKey: {
      updateURL: null // overwrite default
    }
  });
  const meta = `
    /* ==UserStyle==
    @updateURL file:///D:/tmp/test.user.css
    ==/UserStyle== */
  `;

  t.is(parser.parse(meta).metadata.updateURL, 'file:///D:/tmp/test.user.css');
});

test('validateVar', t => {
  const parser = createParser({
    mandatoryKeys: [],
    validateVar: {
      color: state => {
        if (state.value === 'red') {
          throw new ParseError({
            code: 'invalidColor',
            index: state.valueIndex
          });
        }
      }
    }
  });
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @var color my-color "My color" blue
    @var color my-color2 "My color 2" |red
    ==/UserStyle== */
  `);

  const err = t.throws(() => parser.parse(text));
  t.is(err.code, 'invalidColor');
  t.is(drawRange(text, err.index), raw);
});

test('suggestive metadata', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    |@advance color font-color "Font color" #ffffff
    ==/UserStyle== */
  `);

  const error = t.throws(() => {
    parse(text, {unknownKey: 'throw', mandatoryKeys: []});
  });
  t.is(error.message, 'Unknown metadata: @advance, did you mean @advanced');
  t.is(error.args[1], 'advanced');
  t.is(drawRange(text, error.index), raw);
});

test('allowErrors', t => {
  const parser = createParser({
    allowErrors: true
  });
  const result = parser.parse(`
    /* ==UserStyle==
    @name foo
    @version x.y.z
    @supportURL ftp://example.com
    ==/UserStyle== */
  `);
  t.is(result.errors[0].code, 'invalidVersion');
  t.is(result.errors[1].code, 'invalidURLProtocol');
  t.is(result.errors[2].code, 'missingMandatory');
});

test('parser.validateVar', t => {
  const parser = createParser();
  const varObject = {
    type: 'checkbox',
    value: '3'
  };
  const err = t.throws(() => parser.validateVar(varObject));
  t.is(err.code, 'invalidCheckboxDefault');
});
