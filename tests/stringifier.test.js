/* eslint dot-notation: 0 */

import test from 'ava';
import endent from 'endent';
import {stringify, createStringifier} from '..';

test('Default template', t => {
  const meta = {
    name: 'test',
    namespace: 'github.com/openstyles/stylus',
    version: '0.1.0',
    description: 'my userstyle',
    author: 'Me'
  };

  t.is(stringify(meta), `/* ==UserStyle==
@name test
@namespace github.com/openstyles/stylus
@version 0.1.0
@description my userstyle
@author Me
==/UserStyle== */`);
});

test('Default template align keys', t => {
  const meta = {
    name: 'test',
    namespace: 'github.com/openstyles/stylus',
    version: '0.1.0',
    description: 'my userstyle',
    author: 'Me'
  };

  t.is(stringify(meta, {alignKeys: true}), `/* ==UserStyle==
@name        test
@namespace   github.com/openstyles/stylus
@version     0.1.0
@description my userstyle
@author      Me
==/UserStyle== */`);
});

test('Multi-line description', t => {
  const meta = {
    description: 'my\nuserstyle'
  };

  t.is(stringify(meta), String.raw`/* ==UserStyle==
@description "my\nuserstyle"
==/UserStyle== */`);
});

test('Escape comment', t => {
  const meta = {
    description: 'foo /* */'
  };

  t.is(stringify(meta), endent`
    /* ==UserStyle==
    @description foo /* *\/
    ==/UserStyle== */
  `);
});

test('Stringify a number', t => {
  const meta = {
    author: 999
  };

  t.is(stringify(meta), String.raw`/* ==UserStyle==
@author 999
==/UserStyle== */`);
});

test('var color', t => {
  const meta = {
    vars: {
      'font-color': {
        type: 'color',
        name: 'font-color',
        label: 'Font-color',
        default: '#123456'
      }
    }
  };

  t.is(stringify(meta), `/* ==UserStyle==
@var color font-color "Font-color" #123456
==/UserStyle== */`);
});

test('var color xstyle format', t => {
  const meta = {
    vars: {
      'font-color': {
        type: 'color',
        name: 'font-color',
        label: 'Font-color',
        default: '#123456'
      }
    }
  };

  t.is(stringify(meta, {format: 'xstyle'}), `/* ==UserStyle==
@advanced color font-color "Font-color" #123456
==/UserStyle== */`);
});

test('var select', t => {
  const meta = {
    vars: {
      'nav-pos': {
        type: 'select',
        name: 'nav-pos',
        label: 'Navbar pos',
        options: [
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
        ]
      }
    }
  };

  t.is(stringify(meta), `/* ==UserStyle==
@var select nav-pos "Navbar pos" {
  "Top:Top": "top",
  "Bottom:Bottom": "bottom",
  "Right:Right": "right",
  "Left:Left": "left"
}
==/UserStyle== */`);
});

test('var select xstyle format', t => {
  const meta = {
    vars: {
      'nav-pos': {
        type: 'select',
        name: 'nav-pos',
        label: 'Navbar pos',
        options: [
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
        ]
      }
    }
  };

  t.is(stringify(meta, {format: 'xstyle'}), endent`
    /* ==UserStyle==
    @advanced dropdown nav-pos "Navbar pos" {
      Top "Top" <<<EOT
    top EOT;
      Bottom "Bottom" <<<EOT
    bottom EOT;
      Right "Right" <<<EOT
    right EOT;
      Left "Left" <<<EOT
    left EOT;
    }
    ==/UserStyle== */
  `);
});

test('var text', t => {
  const meta = {
    vars: {
      height: {
        type: 'text',
        name: 'height',
        label: 'Set height',
        default: '10px'
      }
    }
  };

  t.is(stringify(meta), `/* ==UserStyle==
@var text height "Set height" 10px
==/UserStyle== */`);
});

test('var text xstyle format', t => {
  const meta = {
    vars: {
      height: {
        type: 'text',
        name: 'height',
        label: 'Set height',
        default: '10px'
      }
    }
  };

  t.is(stringify(meta, {format: 'xstyle'}), `/* ==UserStyle==
@advanced text height "Set height" "10px"
==/UserStyle== */`);
});

test('var image xstyle format', t => {
  const meta = {
    vars: {
      background: {
        type: 'image',
        name: 'background',
        label: 'Page background',
        options: [
          {
            name: 'bg_1',
            label: 'Background 1',
            value: 'http://example.com/example.jpg'
          }, {
            name: 'bg_2',
            label: 'Background 2',
            value: 'http://example.com/photo.php?id=_A_IMAGE_ID_'
          }
        ]
      }
    }
  };

  t.is(stringify(meta, {format: 'xstyle'}), `/* ==UserStyle==
@advanced image background "Page background" {
  bg_1 "Background 1" "http://example.com/example.jpg"
  bg_2 "Background 2" "http://example.com/photo.php?id=_A_IMAGE_ID_"
}
==/UserStyle== */`);
});

test('var dropdown', t => {
  const meta = {
    vars: {
      browser: {
        type: 'dropdown',
        name: 'browser',
        label: 'Your browser',
        options: [
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
        ]
      }
    }
  };

  t.is(stringify(meta, {format: 'xstyle'}), `/* ==UserStyle==
@advanced dropdown browser "Your browser" {
  fx "Firefox" <<<EOT
background-color: red; EOT;
  cr "Chrome" <<<EOT
background-color: green; EOT;
}
==/UserStyle== */`);
});

test('user stringify key', t => {
  const meta = {
    myKey: 'foo'
  };
  const stringifier = createStringifier({
    stringifyKey: {
      myKey: value => `${value} OK`
    }
  });
  t.is(stringifier.stringify(meta), `/* ==UserStyle==
@myKey foo OK
==/UserStyle== */`);
});

test('user stringify key multiple', t => {
  const meta = {
    myKey: ['foo', 'bar']
  };
  const stringifier = createStringifier({
    stringifyKey: {
      myKey: value => value.map(v => `${v} OK`)
    }
  });
  t.is(stringifier.stringify(meta), `/* ==UserStyle==
@myKey foo OK
@myKey bar OK
==/UserStyle== */`);
});

test('user stringify var', t => {
  const meta = {
    vars: {
      'my-foo': {
        type: 'foo',
        name: 'my-foo',
        label: 'Foo option',
        default: 'bar'
      }
    }
  };
  const stringifier = createStringifier({
    stringifyVar: {
      foo: va => `${va.default} OK`
    }
  });
  t.is(stringifier.stringify(meta), `/* ==UserStyle==
@var foo my-foo "Foo option" bar OK
==/UserStyle== */`);
});
