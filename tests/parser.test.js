/* eslint dot-notation: 0 */

import test from 'ava';
import {createParser, util, parse, ParseError} from '..';

const parser = createParser();
const looseParser = createParser({mandatoryKeys: []});

function extractRange(text) {
  const index = text.indexOf('|');
  return {
    text: text.slice(0, index) + text.slice(index + 1),
    index,
    raw: text
  };
}

function drawRange(text, index) {
  return text.slice(0, index) + '|' + text.slice(index);
}

test('Default template', t => {
  const meta = `
    /* ==UserStyle==
    @name        test
    @namespace   github.com/openstyles/stylus
    @version     0.1.0
    @description my userstyle
    @author      Me
    ==/UserStyle== */
  `;

  t.deepEqual(parser.parse(meta).metadata, {
    name: 'test',
    namespace: 'github.com/openstyles/stylus',
    version: '0.1.0',
    description: 'my userstyle',
    author: 'Me'
  });
});

test('Unquote', t => {
  const meta = `
    /* ==UserStyle==
    @description "foo bar"
    ==/UserStyle== */
  `;

  t.deepEqual(looseParser.parse(meta).metadata, {
    description: 'foo bar'
  });
});

test('Unquote multiline', t => {
  const meta = String.raw`
    /* ==UserStyle==
    @description "foo\nbar"
    ==/UserStyle== */
  `;

  t.deepEqual(looseParser.parse(meta).metadata, {
    description: 'foo\nbar'
  });
});

test('Unescape comment', t => {
  const meta = String.raw`
    /* ==UserStyle==
    @description foo /* *\/
    ==/UserStyle== */
  `;

  t.deepEqual(looseParser.parse(meta).metadata, {
    description: 'foo /* */'
  });
});

test('Missing metadata @name', t => {
  const meta = `
    /* ==UserStyle==
    @namespace   github.com/openstyles/stylus
    @version     0.1.0
    ==/UserStyle== */
  `;

  const error = t.throws(() => parser.parse(meta));
  t.is(error.message, 'Missing metadata: @name');
});

test('Missing metadata @namespace', t => {
  const meta = `
    /* ==UserStyle==
    @name        test
    @version     0.1.0
    ==/UserStyle== */
  `;

  const error = t.throws(() => parser.parse(meta));
  t.is(error.message, 'Missing metadata: @namespace');
});

test('Missing metadata @version', t => {
  const meta = `
    /* ==UserStyle==
    @name        test
    @namespace   github.com/openstyles/stylus
    ==/UserStyle== */
  `;

  const error = t.throws(() => parser.parse(meta));
  t.is(error.message, 'Missing metadata: @version');
});

test('Invalid version', t => {
  const meta = `
    /* ==UserStyle==
    @version 0.1.x
    ==/UserStyle== */
  `;

  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.message, 'Invalid version: 0.1.x');
});

test('Normalize version', t => {
  const meta = `
    /* ==UserStyle==
    @version v0.1.0
    ==/UserStyle== */
  `;

  t.is(looseParser.parse(meta).metadata.version, '0.1.0');
});

test('basic @var color', t => {
  const meta = `
    /* ==UserStyle==
    @var color font-color 'Font-color' #123456
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['font-color'];
  t.is(va.type, 'color');
  t.is(va.label, 'Font-color');
  t.is(va.default, '#123456');
});

test('basic @var select', t => {
  const meta = `
    /* ==UserStyle==
    @var select nav-pos "Navbar pos" {
      "Top": "top",
      "Bottom": "bottom",
      "Right": "right",
      "Left": "left"
    }
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['nav-pos'];
  t.is(va.type, 'select');
  t.is(va.label, 'Navbar pos');
  t.is(va.default, 'Top');
  t.deepEqual(va.options, [
    {
      name: 'Top',
      label: 'Top',
      value: 'top'
    },
    {
      name: 'Bottom',
      label: 'Bottom',
      value: 'bottom'
    },
    {
      name: 'Right',
      label: 'Right',
      value: 'right'
    },
    {
      name: 'Left',
      label: 'Left',
      value: 'left'
    },
  ]);
});

test('basic @var select error', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @var select nav-pos "Navbar pos" |{}
    ==/UserStyle== */
  `);

  const error = t.throws(() => looseParser.parse(text));
  t.is(error.message, 'Option list is empty');
  t.is(drawRange(text, error.index), raw);
});

test('basic @var select with built-in label', t => {
  const meta = `
    /* ==UserStyle==
    @var select nav-pos Navbar {
      'near_black:Near Black': '#111111',
      'near_white:Near White': '#eeeeee'
    }
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['nav-pos'];
  t.is(va.type, 'select');
  t.is(va.label, 'Navbar');
  t.is(va.default, 'near_black');
  t.deepEqual(va.options, [
    {
      name: 'near_black',
      label: 'Near Black',
      value: '#111111'
    },
    {
      name: 'near_white',
      label: 'Near White',
      value: '#eeeeee'
    }
  ]);
});

test('basic @var select set as an array', t => {
  const meta = `
    /* ==UserStyle==
    @var select theme "Theme" ['dark', 'light']
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['theme'];
  t.is(va.type, 'select');
  t.is(va.label, 'Theme');
  t.is(va.default, 'dark');
  t.deepEqual(va.options, [
    {
      name: 'dark',
      label: 'dark',
      value: 'dark'
    },
    {
      name: 'light',
      label: 'light',
      value: 'light'
    }
  ]);
});

test('basic @var select set as an array with built-in label', t => {
  const meta = `
    /* ==UserStyle==
    @var select theme "Theme" ['dark:Dark theme', 'light:Light theme']
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['theme'];
  t.is(va.type, 'select');
  t.is(va.label, 'Theme');
  t.is(va.default, 'dark');
  t.deepEqual(va.options, [
    {
      name: 'dark',
      label: 'Dark theme',
      value: 'dark'
    },
    {
      name: 'light',
      label: 'Light theme',
      value: 'light'
    }
  ]);
});

test('basic @var select specify default', t => {
  const meta = `
    /* ==UserStyle==
    @var select theme "Theme" ['dark', 'light*']
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['theme'];
  t.is(va.type, 'select');
  t.is(va.label, 'Theme');
  t.is(va.default, 'light');
  t.deepEqual(va.options, [
    {
      name: 'dark',
      label: 'dark',
      value: 'dark'
    },
    {
      name: 'light',
      label: 'light',
      value: 'light'
    }
  ]);
});

test('basic @var select specify default with label', t => {
  const meta = `
    /* ==UserStyle==
    @var select theme "Theme" ['dark:Dark theme', 'light:Light theme*']
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['theme'];
  t.is(va.type, 'select');
  t.is(va.label, 'Theme');
  t.is(va.default, 'light');
  t.deepEqual(va.options, [
    {
      name: 'dark',
      label: 'Dark theme',
      value: 'dark'
    },
    {
      name: 'light',
      label: 'Light theme',
      value: 'light'
    }
  ]);
});

test('basic @var select specify default with object', t => {
  const meta = `
    /* ==UserStyle==
    @var select theme "Theme" {
      'dark:Dark theme': 'black',
      'light:Light theme*': 'white'
    }
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['theme'];
  t.is(va.type, 'select');
  t.is(va.label, 'Theme');
  t.is(va.default, 'light');
  t.deepEqual(va.options, [
    {
      name: 'dark',
      label: 'Dark theme',
      value: 'black'
    },
    {
      name: 'light',
      label: 'Light theme',
      value: 'white'
    }
  ]);
});

test('basic @var select specify default with object without name', t => {
  const meta = `
    /* ==UserStyle==
    @var select theme "Theme" {
      'Dark theme': 'black',
      'Light theme*': 'white'
    }
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['theme'];
  t.is(va.type, 'select');
  t.is(va.label, 'Theme');
  t.is(va.default, 'Light theme');
  t.deepEqual(va.options, [
    {
      name: 'Dark theme',
      label: 'Dark theme',
      value: 'black'
    },
    {
      name: 'Light theme',
      label: 'Light theme',
      value: 'white'
    }
  ]);
});

test('basic @var select specify multiple defaults', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @var select theme "Theme" |['dark*', 'light*']
    ==/UserStyle== */
  `);

  const err = t.throws(() => looseParser.parse(text));
  t.is(err.code, 'invalidSelectMultipleDefaults');
  t.is(drawRange(text, err.index), raw);
});

test('basic @var checkbox', t => {
  const meta = `
    /* ==UserStyle==
    @var checkbox affix "Set affixed" 1
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['affix'];
  t.is(va.type, 'checkbox');
  t.is(va.label, 'Set affixed');
  t.is(va.default, '1');
});

test('basic @var checkbox error', t => {
  const {text, raw} = extractRange(`
    /* ==UserStyle==
    @var checkbox affix "Set affixed" |2
    ==/UserStyle== */
  `);

  const error = t.throws(() => looseParser.parse(text));
  t.is(error.message, 'value must be 0 or 1');
  t.is(drawRange(text, error.index), raw);
});

test('basic @var text', t => {
  const meta = `
    /* ==UserStyle==
    @var text height "Set height" 10px
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'text');
  t.is(va.label, 'Set height');
  t.is(va.default, '10px');
});

test('@var number', t => {
  const meta = `
    /* ==UserStyle==
    @var number height "Set height" 10
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'number');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, null);
  t.is(va.max, null);
  t.is(va.step, null);
  t.is(va.units, null);
});

test('@var number array', t => {
  const meta = `
    /* ==UserStyle==
    @var number height "Set height" [10, 0, 20, 1]
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'number');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, 0);
  t.is(va.max, 20);
  t.is(va.step, 1);
  t.is(va.units, null);
});

test('@var number array with null', t => {
  const meta = `
    /* ==UserStyle==
    @var number height "Set height" [10, 0, null, 1]
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'number');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, 0);
  t.is(va.max, null);
  t.is(va.step, 1);
  t.is(va.units, null);
});

test('@var number array with units', t => {
  const meta = `
    /* ==UserStyle==
    @var number height "Set height" [10, 'px', 0]
    ==/UserStyle== */
  `;

  const va = looseParser.parse(meta).metadata.vars['height'];
  t.is(va.type, 'number');
  t.is(va.label, 'Set height');
  t.is(va.default, 10);
  t.is(va.min, 0);
  t.is(va.max, null);
  t.is(va.step, null);
  t.is(va.units, 'px');
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
