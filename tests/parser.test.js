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
        t.is(err[key], value);
      }
      if (err.index != null) {
        t.is(drawRange(text, err.index), raw);
      }
      return;
    }

    const result = run();
    t.deepEqual(result.metadata, metadata);

    const {metadata: newMetadata} = parse(stringify(metadata), {mandatoryKeys: []});
    t.deepEqual(newMetadata, metadata);
  });
}

test('mandatoryKeys', t => {
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

test('@var range', t => {
  const meta = `
    /* ==UserStyle==
    @var range height "Set height" 10
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'range');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, null);
  t.is(va.max, null);
  t.is(va.step, null);
  t.is(va.units, null);
});

test('@var range array', t => {
  const meta = `
    /* ==UserStyle==
    @var range height "Set height" [10, 0, 20, 1]
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'range');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, 0);
  t.is(va.max, 20);
  t.is(va.step, 1);
  t.is(va.units, null);
});

test('@var range array with null', t => {
  const meta = `
    /* ==UserStyle==
    @var range height "Set height" [10, 0, null, 1]
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'range');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, 0);
  t.is(va.max, null);
  t.is(va.step, 1);
  t.is(va.units, null);
});

test('@var range array with units', t => {
  const meta = `
    /* ==UserStyle==
    @var range height "Set height" [10, 'px', 0]
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'range');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, 0);
  t.is(va.max, null);
  t.is(va.step, null);
  t.is(va.units, 'px');
});

test('basic @advanced text', t => {
  const meta = `
    /* ==UserStyle==
    @advanced text height "Set height" "10px"
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'text');
  t.is(va.label, 'Set height');
  t.is(va.default, '10px');
});

test('basic @advanced color', t => {
  const meta = `
    /* ==UserStyle==
    @advanced color font-color "Font color" #ffffff
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['font-color'];
  t.is(va.type, 'color');
  t.is(va.label, 'Font color');
  t.is(va.default, '#ffffff');
});

test('basic @advanced image', t => {
  const meta = `
    /* ==UserStyle==
    @advanced image background "Page background" {
      bg_1 "Background 1" "http://example.com/example.jpg"
      bg_2 "Background 2" "http://example.com/photo.php?id=_A_IMAGE_ID_"
    }
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['background'];
  t.is(va.type, 'image');
  t.is(va.label, 'Page background');
  t.is(va.default, 'bg_1');
  t.deepEqual(va.options, [
    {
      name: 'bg_1',
      label: 'Background 1',
      value: 'http://example.com/example.jpg'
    },
    {
      name: 'bg_2',
      label: 'Background 2',
      value: 'http://example.com/photo.php?id=_A_IMAGE_ID_'
    }
  ]);
});

test('basic @advanced image error', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @advanced image background "Page background" |[]
    ==/UserStyle== */
  `);

  const error = t.throws(() => looseParser.parse(text));
  t.is(error.message, "Missing character: '{'");
  t.is(drawRange(text, error.index), raw);
});

test('basic @advanced image error empty', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @advanced image background "Page background" |{}
    ==/UserStyle== */
  `);

  const error = t.throws(() => looseParser.parse(text));
  t.is(error.message, 'Option list is empty');
  t.is(drawRange(text, error.index), raw);
});

test('basic @advanced dropdown', t => {
  const meta = `
    /* ==UserStyle==
    @advanced dropdown browser "Your browser" {
      fx "Firefox" <<<EOT
    background-color: red; EOT;
      cr "Chrome" <<<EOT
    background-color: green; EOT;
    }
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['browser'];
  t.is(va.type, 'dropdown');
  t.is(va.label, 'Your browser');
  t.is(va.default, 'fx');
  t.deepEqual(va.options, [
    {
      name: 'fx',
      label: 'Firefox',
      value: 'background-color: red;'
    },
    {
      name: 'cr',
      label: 'Chrome',
      value: 'background-color: green;'
    }
  ]);
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
