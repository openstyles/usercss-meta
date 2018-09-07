/* eslint dot-notation: 0 */

import test from 'ava';
import {createParser, util, parse} from '..';

const parser = createParser();
const looseParser = createParser({mandatoryKeys: []});

test('Default template', t => {
  const meta = `
/* ==UserStyle==
@name        test
@namespace   github.com/openstyles/stylus
@version     0.1.0
@description my userstyle
@author      Me
==/UserStyle== */`.trim();

  t.deepEqual(parser.parse(meta), {
    name: 'test',
    namespace: 'github.com/openstyles/stylus',
    version: '0.1.0',
    description: 'my userstyle',
    author: 'Me'
  });
});

test('Unquote', t => {
  const meta = `/* ==UserStyle==
@description "foo bar"
==/UserStyle== */`;

  t.deepEqual(looseParser.parse(meta), {
    description: 'foo bar'
  });
});

test('Unquote multiline', t => {
  const meta = String.raw`/* ==UserStyle==
@description "foo\nbar"
==/UserStyle== */`;

  t.deepEqual(looseParser.parse(meta), {
    description: 'foo\nbar'
  });
});

test('Missing metadata @name', t => {
  const meta = `
/* ==UserStyle==
@namespace   github.com/openstyles/stylus
@version     0.1.0
==/UserStyle== */`.trim();

  const error = t.throws(() => parser.parse(meta));
  t.is(error.message, 'Missing metadata: @name');
});

test('Missing metadata @namespace', t => {
  const meta = `
/* ==UserStyle==
@name        test
@version     0.1.0
==/UserStyle== */`.trim();

  const error = t.throws(() => parser.parse(meta));
  t.is(error.message, 'Missing metadata: @namespace');
});

test('Missing metadata @version', t => {
  const meta = `
/* ==UserStyle==
@name        test
@namespace   github.com/openstyles/stylus
==/UserStyle== */`.trim();

  const error = t.throws(() => parser.parse(meta));
  t.is(error.message, 'Missing metadata: @version');
});

test('Invalid version', t => {
  const meta = `
/* ==UserStyle==
@version 0.1.x
==/UserStyle== */`.trim();

  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.message, 'Invalid version: 0.1.x');
});

test('Normalize version', t => {
  const meta = `
/* ==UserStyle==
@version v0.1.0
==/UserStyle== */`.trim();

  t.is(looseParser.parse(meta).version, '0.1.0');
});

test('basic @var color', t => {
  const meta = `
/* ==UserStyle==
@var color font-color 'Font-color' #123456
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['font-color'];
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
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['nav-pos'];
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
  const meta = `
/* ==UserStyle==
@var select nav-pos "Navbar pos" {}
==/UserStyle== */`.trim();

  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.message, 'Option list is empty');
  t.is(error.index, 50);
});

test('basic @var select with built-in label', t => {
  const meta = `
/* ==UserStyle==
@var select nav-pos Navbar {
  'near_black:Near Black': '#111111',
  'near_white:Near White': '#eeeeee'
}
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['nav-pos'];
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
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['theme'];
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
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['theme'];
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

test('basic @var checkbox', t => {
  const meta = `
/* ==UserStyle==
@var checkbox affix "Set affixed" 1
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['affix'];
  t.is(va.type, 'checkbox');
  t.is(va.label, 'Set affixed');
  t.is(va.default, '1');
});

test('basic @var checkbox error', t => {
  const meta = `
/* ==UserStyle==
@var checkbox affix "Set affixed" 2
==/UserStyle== */`.trim();

  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.message, 'value must be 0 or 1');
  t.is(error.index, 51);
});

test('basic @var text', t => {
  const meta = `
/* ==UserStyle==
@var text height "Set height" 10px
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['height'];
  t.is(va.type, 'text');
  t.is(va.label, 'Set height');
  t.is(va.default, '10px');
});

test('basic @advanced text', t => {
  const meta = `
/* ==UserStyle==
@advanced text height "Set height" "10px"
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['height'];
  t.is(va.type, 'text');
  t.is(va.label, 'Set height');
  t.is(va.default, '10px');
});

test('basic @advanced color', t => {
  const meta = `
/* ==UserStyle==
@advanced color font-color "Font color" #ffffff
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['font-color'];
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
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['background'];
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
  const meta = `
/* ==UserStyle==
@advanced image background "Page background" []
==/UserStyle== */`.trim();

  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.index, 62);
  t.is(error.message, "Missing character: '{'");
});

test('basic @advanced image error empty', t => {
  const meta = `
/* ==UserStyle==
@advanced image background "Page background" {}
==/UserStyle== */`.trim();

  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.index, 62);
  t.is(error.message, 'Option list is empty');
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
==/UserStyle== */`.trim();

  const va = looseParser.parse(meta).vars['browser'];
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
  const meta = `
/* ==UserStyle==
@var unknown my-var "My variable" 123456
==/UserStyle== */`.trim();
  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.index, 22);
  t.is(error.message, 'Unknown @var type: unknown');
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
==/UserStyle== */`;

  const result = parse(meta, {unknownKey: 'ignore', mandatoryKeys: []});
  t.is(result.myKey, undefined);
});

test('unknownKey assign', t => {
  const meta = `
/* ==UserStyle==
@myKey 123 456
==/UserStyle== */`;

  const result = parse(meta, {unknownKey: 'assign', mandatoryKeys: []});
  t.is(result.myKey, '123 456');
});

test('unknownKey throw', t => {
  const meta = `
/* ==UserStyle==
@myKey 123 456
==/UserStyle== */`.trim();

  const error = t.throws(() => {
    parse(meta, {unknownKey: 'throw', mandatoryKeys: []});
  });
  t.is(error.index, 17);
  t.is(error.message, 'Unknown metadata: @myKey');
});

test('unknownKey invalid', t => {
  const meta = `
/* ==UserStyle==
@myKey 123 456
==/UserStyle== */`.trim();

  const error = t.throws(() => {
    parse(meta, {unknownKey: 'invalid', mandatoryKeys: []});
  });
  t.is(error.message, "unknownKey must be 'ignore', 'assign', or 'throw'");
});

test('basic URLs', t => {
  const meta = `
/* ==UserStyle==
@homepageURL https://github.com/StylishThemes/parse-usercss
==/UserStyle== */`.trim();

  const result = looseParser.parse(meta);
  t.is(result.homepageURL, 'https://github.com/StylishThemes/parse-usercss');
});

test('basic URLs error', t => {
  const meta = `
/* ==UserStyle==
@homepageURL file:///C:/windows
==/UserStyle== */`.trim();

  const error = t.throws(() => looseParser.parse(meta));
  t.is(error.message, 'Invalid protocol: file:');
  t.is(error.index, 30);
});

test('user parse key', t => {
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
==/UserStyle== */`.trim();

  t.is(parser.parse(meta).myKey, 'Hello OK');
});

test('user parse var', t => {
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
==/UserStyle== */`.trim();

  const va = parser.parse(meta).vars['my-color'];
  t.is(va.type, 'color');
  t.is(va.label, 'My color');
  t.is(va.default, '#fff OK');
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
