/* eslint dot-notation: 0 */

import fs from 'fs';
import test from 'ava';
import {createParser, util, parse, ParseError, stringify} from '..';

const looseParser = createParser({mandatoryKeys: []});

function extractRange(text) {
  const index = text.indexOf('|');
  return {
    text: text.slice(0, index) + text.slice(index + 1),
    index,
    raw: text
  };
}

function tryReadJSON(path) {
  let text = null;
  try {
    text = fs.readFileSync(path, 'utf8');
  } catch (err) {
    return;
  }
  return JSON.parse(text);
}

function drawRange(text, index) {
  return text.slice(0, index) + '|' + text.slice(index);
}

for (const dir of fs.readdirSync(`${__dirname}/cases`)) {
  test(dir, t => {
    const {text, raw} = extractRange(
      fs.readFileSync(`${__dirname}/cases/${dir}/text.txt`, 'utf8').replace(/\r/g, '')
    );
    const metadata = tryReadJSON(`${__dirname}/cases/${dir}/metadata.json`);
    const error = tryReadJSON(`${__dirname}/cases/${dir}/error.json`);

    function run() {
      return parse(text, {mandatoryKeys: []});
    }

    if (error) {
      const err = t.throws(run);
      for (const [key, value] of Object.entries(error)) {
        t.deepEqual(err[key], value);
      }
      if (err.index != null) {
        t.is(drawRange(text, err.index), raw);
      }
      return;
    }

    const result = run();
    t.deepEqual(result.metadata, metadata);

    const newText = stringify(metadata);
    const {metadata: newMetadata} = parse(newText, {mandatoryKeys: []});
    t.deepEqual(newMetadata, metadata);
  });
}

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

test('allowErrors', t => {
  const parser = createParser({
    allowErrors: true
  });
  const result = parser.parse(`
    /* ==UserStyle==
    @name foo
    @version 0.1.01
    @supportURL ftp://example.com
    ==/UserStyle== */
  `);
  t.is(result.errors[0].code, 'invalidVersion');
  t.is(result.errors[1].code, 'invalidURLProtocol');
  t.is(result.errors[2].code, 'missingMandatory');
});

test('parser.validateVar', t => {
  const parser = createParser();
  const varObj = {
    type: 'checkbox',
    value: '3'
  };
  const err = t.throws(() => parser.validateVar(varObj));
  t.is(err.code, 'invalidCheckboxDefault');
});
